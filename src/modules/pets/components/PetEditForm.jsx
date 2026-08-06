/**
 * @fileoverview PetEditForm — dialog completo de edição/cadastro do pet do abrigo.
 *
 * Campos organizados em 5 seções (spec do abrigo):
 *  IDENTIDADE · CARACTERÍSTICAS · INFORMAÇÕES DE SAÚDE ·
 *  INFORMAÇÕES DO ABRIGO · OUTRAS INFORMAÇÕES
 *
 * Cada campo tem uma etiqueta de visibilidade: "público" (entra na página
 * pública do pet) ou "privado" (só banco/planilhas/métricas do abrigo). Os
 * campos privados NÃO devem ser renderizados na página pública.
 *
 * Apenas canManage (owner + membros do abrigo com atribuição) pode editar.
 * Toda alteração é registrada no log do pet (updatePet → appendPetLog).
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React, { useState, useEffect } from 'react';
import {
  Edit, Loader2, Fingerprint, PawPrint, HeartPulse, Building2, FileText, MapPin, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { cn } from '@/core/lib/utils';
import { useUpdatePet } from '../hooks/usePets';
import {
  CURRENT_LOCATIONS, CURRENT_LOCATION_LABELS, daysInShelter,
} from '@/modules/shelter/domain/core/animal';
import { assignRescueNumber } from '@/modules/shelter/services/shelterAnimalService';
import { logger } from '@/core/lib/logger';
import RescuePhotosField from './RescuePhotosField';

const SPECIES = [
  { value: 'dog', label: 'Cachorro' },
  { value: 'cat', label: 'Gato' },
  { value: 'rabbit', label: 'Coelho' },
  { value: 'bird', label: 'Pássaro' },
  { value: 'other', label: 'Outro' },
];
const SIZES = [
  { value: 'mini', label: 'Mini' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'giant', label: 'Gigante' },
];
const AGES = [
  { value: 'puppy', label: 'Filhote' },
  { value: 'adult', label: 'Adulto' },
  { value: 'senior', label: 'Idoso' },
];
const ENERGIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];
const STATUSES = [
  { value: 'available', label: 'Disponível' },
  { value: 'in_process', label: 'Em processo' },
  { value: 'adopted', label: 'Adotado' },
  { value: 'unavailable', label: 'Indisponível' },
];

const INITIAL = {
  // Identidade
  name: '',
  title: '',
  pet_code: '',
  national_pet_id: '',
  microchip: '',
  shelter_internal_id: '',
  // Características
  species: 'dog',
  breed: '',
  size: 'medium',
  age_group: 'adult',
  apparent_age_years: '',
  birth_date: '',
  gender: 'male',
  energy_level: 'medium',
  // Saúde
  health_notes: '',
  neutered: false,
  dewormed: false,
  vaccinated: 'no',
  // Abrigo
  rescue_name: '',
  rescue_responsible_name: '',
  rescue_address: '',
  rescue_city: '',
  rescue_state: '',
  rescue_lat: '',
  rescue_lng: '',
  status: 'available',
  current_location: '',
  current_location_notes: '',
  legal_process_number: '',
  observations: '',
  rescue_photos: [],
  // Outras
  description: '',
  special_needs: '',
  adoption_requirements: '',
};

/** Etiqueta de visibilidade do campo (público × privado do abrigo). */
function Vis({ pub }) {
  return (
    <span
      className={cn(
        'ml-1.5 rounded px-1 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide',
        pub
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      )}
      title={pub ? 'Aparece na página pública do pet' : 'Interno do abrigo — não aparece na página pública'}
    >
      {pub ? 'público' : 'privado'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return null;
  try {
    const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

/** Seção do formulário: cabeçalho com ícone + título + subtítulo, num card. */
function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-muted/20 p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Campo com rótulo (+ obrigatoriedade e visibilidade), controle, erro e ajuda. */
function Field({ label, htmlFor, required, vis, error, help, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="flex flex-wrap items-center gap-x-1 text-[13px] font-medium">
        <span>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
        {vis === 'public' && <Vis pub />}
        {vis === 'private' && <Vis />}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {help && !error && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Caixa somente-leitura para valores gerados pelo sistema. */
function ReadonlyBox({ children }) {
  return (
    <div className="flex h-10 items-center rounded-md border border-dashed border-input bg-muted/40 px-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function PetEditForm({ open, onOpenChange, pet }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const updateMut = useUpdatePet();
  const loading = updateMut.isPending;

  useEffect(() => {
    if (open && pet) {
      setData({
        ...INITIAL,
        name: pet.name || '',
        title: pet.title || '',
        pet_code: pet.pet_code || '',
        national_pet_id: pet.national_pet_id || '',
        microchip: pet.microchip || '',
        shelter_internal_id: pet.shelter_internal_id || '',
        species: pet.species || 'dog',
        breed: pet.breed || '',
        size: pet.size || 'medium',
        age_group: pet.age_group || 'adult',
        apparent_age_years: pet.apparent_age_years != null ? String(pet.apparent_age_years) : '',
        birth_date: (pet.birth_date || '').slice(0, 10),
        gender: pet.gender || 'male',
        energy_level: pet.energy_level || 'medium',
        health_notes: pet.health_notes || '',
        neutered: Boolean(pet.neutered),
        dewormed: Boolean(pet.dewormed),
        vaccinated: pet.vaccinated || 'no',
        rescue_name: pet.rescue_name || '',
        rescue_responsible_name: pet.rescue_responsible_name || '',
        rescue_address: pet.rescue_address || '',
        rescue_city: pet.rescue_city || '',
        rescue_state: pet.rescue_state || '',
        rescue_lat: pet.rescue_lat ?? '',
        rescue_lng: pet.rescue_lng ?? '',
        status: pet.status || 'available',
        current_location: pet.current_location || '',
        current_location_notes: pet.current_location_notes || '',
        legal_process_number: pet.legal_process_number || '',
        observations: pet.observations || '',
        rescue_photos: Array.isArray(pet.rescue_photos) ? pet.rescue_photos : [],
        description: pet.description || '',
        special_needs: pet.special_needs || '',
        adoption_requirements: pet.adoption_requirements || '',
      });
      setErrors({});
    }
  }, [open, pet]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    const req = (k, label) => { if (!String(data[k] ?? '').trim()) errs[k] = `${label} é obrigatório`; };
    // Campos de preenchimento obrigatório (spec do abrigo). Exceção:
    // "Processo judicial" é obrigatório existir mas pode ficar VAZIO
    // ("vazio ou número"), então não bloqueia.
    if (!data.name || data.name.trim().length < 2) errs.name = 'Nome no abrigo é obrigatório (≥ 2 caracteres)';
    req('title', 'Título no abrigo');
    req('national_pet_id', 'RG (nacional)');
    req('microchip', 'Microchip');
    if (!String(data.apparent_age_years ?? '').trim()) errs.apparent_age_years = 'Idade aparente é obrigatória';
    else if (Number.isNaN(Number(data.apparent_age_years))) errs.apparent_age_years = 'Idade aparente deve ser um número (anos)';
    req('health_notes', 'Observações de saúde');
    req('rescue_responsible_name', 'Responsável pelo resgate');
    const hasGps = String(data.rescue_lat).trim() && String(data.rescue_lng).trim();
    if (!String(data.rescue_address ?? '').trim() && !hasGps) errs.rescue_address = 'Local do resgate é obrigatório (texto ou GPS)';
    req('current_location', 'Localização atual');
    req('observations', 'Observações');
    req('description', 'Descrição');
    req('special_needs', 'Necessidades especiais');
    req('adoption_requirements', 'Requisitos para adoção');
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Preencha todos os campos obrigatórios destacados.');
    }
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const toNum = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const updates = {
      ...data,
      apparent_age_years: toNum(data.apparent_age_years),
      rescue_lat: toNum(data.rescue_lat),
      rescue_lng: toNum(data.rescue_lng),
      birth_date: data.birth_date || null,
    };
    // Data da última alteração do status (interno): registra a mudança.
    if (data.status !== pet?.status) {
      updates.status_changed_at = new Date().toISOString();
    }
    // pet_code é gerado pelo sistema — não reenviar se inalterado.
    if (updates.pet_code === pet?.pet_code) delete updates.pet_code;
    try {
      await updateMut.mutateAsync({ petId: pet.id, updates });
      // Backfill do número de resgate para pets de abrigo sem número.
      if (pet?.owner_type === 'organization' && pet?.owner_id && !pet?.rescue_number) {
        try {
          await assignRescueNumber(pet.id, {
            clubId: pet.owner_id,
            species: data.species,
            actor: { uid: user?.uid, email: user?.email },
          });
        } catch (err) {
          logger.warn('[PetEditForm] assignRescueNumber falhou (não bloqueante):', err);
        }
      }
      toast.success('Pet atualizado');
      onOpenChange(false);
    } catch (err) {
      logger.error('[PetEditForm] update failed:', err);
      toast.error(err?.message || 'Erro ao atualizar pet');
    }
  }

  const dias = daysInShelter(pet);
  const statusDate = formatDate(pet?.status_changed_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Edit className="h-5 w-5 text-primary" aria-hidden="true" />
            Editar pet
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Apenas o responsável e membros do abrigo podem editar.</span>
            <span className="inline-flex items-center gap-1"><Vis pub /> aparece na página pública</span>
            <span className="inline-flex items-center gap-1"><Vis /> interno do abrigo</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-9rem)] flex-col">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="pet-form-errors">
                <p className="font-semibold">Preencha os campos obrigatórios:</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {Object.values(errors).map((msg) => <li key={msg}>{msg}</li>)}
                </ul>
              </div>
            )}

            {/* ── IDENTIDADE ───────────────────────────────────────────── */}
            <Section icon={Fingerprint} title="Identidade" subtitle="Como o pet é identificado no abrigo e na plataforma.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome no abrigo" htmlFor="name" required vis="public" error={errors.name}>
                  <Input id="name" value={data.name} onChange={(e) => setField('name', e.target.value)} aria-invalid={!!errors.name} />
                </Field>
                <Field label="Título no abrigo" htmlFor="title" required vis="private" error={errors.title}>
                  <Input id="title" value={data.title} onChange={(e) => setField('title', e.target.value)} placeholder="Título interno" aria-invalid={!!errors.title} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="ID interno da plataforma" vis="public" help="Gerado automaticamente pelo sistema.">
                  <ReadonlyBox>{data.pet_code || '— gerado pelo sistema'}</ReadonlyBox>
                </Field>
                <Field label="RG (nacional)" htmlFor="national_pet_id" required vis="public">
                  <Input id="national_pet_id" value={data.national_pet_id} onChange={(e) => setField('national_pet_id', e.target.value)} placeholder="ABRADOG-12345-BR" aria-invalid={!!errors.national_pet_id} />
                </Field>
                <Field label="Microchip" htmlFor="microchip" required vis="public">
                  <Input id="microchip" value={data.microchip} onChange={(e) => setField('microchip', e.target.value)} placeholder="985112004523..." maxLength={15} aria-invalid={!!errors.microchip} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ID do abrigo" htmlFor="shelter_internal_id" vis="private" help="Número interno do abrigo (opcional).">
                  <Input id="shelter_internal_id" value={data.shelter_internal_id} onChange={(e) => setField('shelter_internal_id', e.target.value)} maxLength={40} />
                </Field>
              </div>
            </Section>

            {/* ── CARACTERÍSTICAS ──────────────────────────────────────── */}
            <Section icon={PawPrint} title="Características" subtitle="Espécie, porte, idade e temperamento do animal.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Espécie" htmlFor="species" required vis="public">
                  <Select value={data.species} onValueChange={(v) => setField('species', v)}>
                    <SelectTrigger id="species"><SelectValue /></SelectTrigger>
                    <SelectContent>{SPECIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Raça" htmlFor="breed" vis="private">
                  <Input id="breed" value={data.breed} onChange={(e) => setField('breed', e.target.value)} placeholder="SRD, Labrador..." />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Porte" htmlFor="size" required vis="public">
                  <Select value={data.size} onValueChange={(v) => setField('size', v)}>
                    <SelectTrigger id="size"><SelectValue /></SelectTrigger>
                    <SelectContent>{SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Idade" htmlFor="age_group" required vis="public">
                  <Select value={data.age_group} onValueChange={(v) => setField('age_group', v)}>
                    <SelectTrigger id="age_group"><SelectValue /></SelectTrigger>
                    <SelectContent>{AGES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Idade aparente (anos)" htmlFor="apparent_age_years" required vis="public" error={errors.apparent_age_years}>
                  <Input id="apparent_age_years" type="number" min="0" step="0.5" value={data.apparent_age_years} onChange={(e) => setField('apparent_age_years', e.target.value)} aria-invalid={!!errors.apparent_age_years} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Data de nascimento" htmlFor="birth_date" vis="private">
                  <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => setField('birth_date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                </Field>
                <Field label="Sexo" htmlFor="gender" required vis="public">
                  <Select value={data.gender} onValueChange={(v) => setField('gender', v)}>
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Macho</SelectItem>
                      <SelectItem value="female">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Energia" htmlFor="energy_level" required vis="public">
                  <Select value={data.energy_level} onValueChange={(v) => setField('energy_level', v)}>
                    <SelectTrigger id="energy_level"><SelectValue /></SelectTrigger>
                    <SelectContent>{ENERGIES.map((en) => <SelectItem key={en.value} value={en.value}>{en.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* ── INFORMAÇÕES DE SAÚDE ─────────────────────────────────── */}
            <Section icon={HeartPulse} title="Informações de saúde" subtitle="Estado de saúde, castração, vermifugação e vacinas.">
              <Field label="Observações de saúde" htmlFor="health_notes" required vis="public" error={errors.health_notes}>
                <Textarea id="health_notes" value={data.health_notes} onChange={(e) => setField('health_notes', e.target.value)} rows={3} aria-invalid={!!errors.health_notes} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <input type="checkbox" checked={data.neutered} onChange={(e) => setField('neutered', e.target.checked)} className="h-4 w-4 rounded border-input" />
                  Castrado <Vis pub />
                </label>
                <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <input type="checkbox" checked={data.dewormed} onChange={(e) => setField('dewormed', e.target.checked)} className="h-4 w-4 rounded border-input" />
                  Vermifugado <Vis pub />
                </label>
                <Field label="Vacinado" htmlFor="vaccinated" required vis="public">
                  <Select value={data.vaccinated} onValueChange={(v) => setField('vaccinated', v)}>
                    <SelectTrigger id="vaccinated"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sim</SelectItem>
                      <SelectItem value="no">Não</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* ── INFORMAÇÕES DO ABRIGO ────────────────────────────────── */}
            <Section icon={Building2} title="Informações do abrigo" subtitle="Resgate, situação e localização atual do animal.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome de resgate" htmlFor="rescue_name" vis="private" help="Título dado pelo resgatante.">
                  <Input id="rescue_name" value={data.rescue_name} onChange={(e) => setField('rescue_name', e.target.value)} maxLength={200} />
                </Field>
                <Field label="Responsável pelo resgate" htmlFor="rescue_responsible_name" required vis="private" error={errors.rescue_responsible_name}>
                  <Input id="rescue_responsible_name" value={data.rescue_responsible_name} onChange={(e) => setField('rescue_responsible_name', e.target.value)} placeholder="Nome de quem resgatou" maxLength={120} aria-invalid={!!errors.rescue_responsible_name} />
                </Field>
              </div>

              {/* Local do resgate — texto + GPS, agrupados. */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Local do resgate <Vis />
                </div>
                <Field label="Endereço / referência" htmlFor="rescue_address" required error={errors.rescue_address}>
                  <Input id="rescue_address" value={data.rescue_address} onChange={(e) => setField('rescue_address', e.target.value)} placeholder="Rua, bairro, ponto de referência" aria-invalid={!!errors.rescue_address} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="Latitude (GPS)" htmlFor="rescue_lat">
                    <Input id="rescue_lat" type="number" step="any" value={data.rescue_lat} onChange={(e) => setField('rescue_lat', e.target.value)} placeholder="-30.0346" />
                  </Field>
                  <Field label="Longitude (GPS)" htmlFor="rescue_lng">
                    <Input id="rescue_lng" type="number" step="any" value={data.rescue_lng} onChange={(e) => setField('rescue_lng', e.target.value)} placeholder="-51.2177" />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!navigator.geolocation) { toast.error('GPS indisponível neste dispositivo.'); return; }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => { setField('rescue_lat', String(pos.coords.latitude)); setField('rescue_lng', String(pos.coords.longitude)); },
                        () => toast.error('Não foi possível obter a localização.'),
                      );
                    }}
                  >
                    <MapPin className="mr-1.5 h-4 w-4" /> Minha localização
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status" htmlFor="status" required vis="public">
                  <Select value={data.status} onValueChange={(v) => setField('status', v)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Última alteração do status" vis="public">
                  <ReadonlyBox>{statusDate || '— (registrado ao mudar o status)'}</ReadonlyBox>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dias no abrigo (automático)" vis="private">
                  <ReadonlyBox>{dias ?? '—'}</ReadonlyBox>
                </Field>
                <Field label="Localização atual" htmlFor="current_location" required vis="private" error={errors.current_location}>
                  <Select value={data.current_location || undefined} onValueChange={(v) => setField('current_location', v)}>
                    <SelectTrigger id="current_location"><SelectValue placeholder="Onde o animal está" /></SelectTrigger>
                    <SelectContent>{CURRENT_LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{CURRENT_LOCATION_LABELS[loc] || loc}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Detalhe da localização atual" htmlFor="current_location_notes" vis="private">
                <Input id="current_location_notes" value={data.current_location_notes} onChange={(e) => setField('current_location_notes', e.target.value)} placeholder="Ex: lar temporário da Maria; clínica VetX" maxLength={280} />
              </Field>
              <Field label="Processo judicial" htmlFor="legal_process_number" required vis="private" help="Número do processo — deixe vazio se não houver.">
                <Input id="legal_process_number" value={data.legal_process_number} onChange={(e) => setField('legal_process_number', e.target.value)} maxLength={60} />
              </Field>
              <Field label="Observações" htmlFor="observations" required vis="private" error={errors.observations}>
                <Textarea id="observations" value={data.observations} onChange={(e) => setField('observations', e.target.value)} rows={3} placeholder="Observações internas sobre o animal" aria-invalid={!!errors.observations} />
              </Field>

              {/* Fotos do resgate — comprimidas; cada uma pode ser pública ou interna. */}
              <div className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  <Camera className="h-4 w-4 text-primary" aria-hidden="true" /> Fotos do resgate
                </div>
                <p className="text-[11px] text-muted-foreground">
                  As fotos são comprimidas ao enviar. Marque cada foto como
                  <strong> pública</strong> (aparece na página do pet) ou
                  <strong> interna</strong> (só a equipe do abrigo vê). Clique para
                  abrir em tamanho grande.
                </p>
                <RescuePhotosField
                  value={data.rescue_photos}
                  onChange={(v) => setField('rescue_photos', v)}
                  uid={user?.uid}
                  canManage
                />
              </div>
            </Section>

            {/* ── OUTRAS INFORMAÇÕES ───────────────────────────────────── */}
            <Section icon={FileText} title="Outras informações" subtitle="Textos que aparecem na página pública do pet.">
              <Field label="Descrição" htmlFor="description" required vis="public" error={errors.description}>
                <Textarea id="description" value={data.description} onChange={(e) => setField('description', e.target.value)} rows={3} placeholder="Personalidade, história, convivência..." aria-invalid={!!errors.description} />
              </Field>
              <Field label="Necessidades especiais" htmlFor="special_needs" required vis="public" error={errors.special_needs}>
                <Textarea id="special_needs" value={data.special_needs} onChange={(e) => setField('special_needs', e.target.value)} rows={2} aria-invalid={!!errors.special_needs} />
              </Field>
              <Field label="Requisitos para adoção" htmlFor="adoption_requirements" required vis="public" error={errors.adoption_requirements}>
                <Textarea id="adoption_requirements" value={data.adoption_requirements} onChange={(e) => setField('adoption_requirements', e.target.value)} rows={2} aria-invalid={!!errors.adoption_requirements} />
              </Field>
            </Section>
          </div>

          <DialogFooter className="gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : (
                <>Salvar alterações</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
