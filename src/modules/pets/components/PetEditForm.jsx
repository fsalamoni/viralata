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
import { Edit, Loader2 } from 'lucide-react';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" aria-hidden="true" />
            Editar pet
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do pet. Apenas o responsável e membros do abrigo
            podem editar. <span className="font-medium">Público</span> = aparece na
            página do pet; <span className="font-medium">privado</span> = interno do abrigo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.keys(errors).length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="pet-form-errors">
              <p className="font-semibold">Preencha os campos obrigatórios:</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {Object.values(errors).map((msg) => <li key={msg}>{msg}</li>)}
              </ul>
            </div>
          )}
          {/* ── IDENTIDADE ─────────────────────────────────────────────── */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Identidade</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Nome no abrigo * <Vis pub /></Label>
                <Input id="name" value={data.name} onChange={(e) => setField('name', e.target.value)} aria-invalid={!!errors.name} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="title">Título no abrigo * <Vis /></Label>
                <Input id="title" value={data.title} onChange={(e) => setField('title', e.target.value)} placeholder="Título interno" aria-invalid={!!errors.title} />
                {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>ID interno da plataforma <Vis pub /></Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {data.pet_code || '— gerado pelo sistema'}
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">Gerado automaticamente</p>
              </div>
              <div>
                <Label htmlFor="national_pet_id">RG (nacional) <Vis pub /></Label>
                <Input id="national_pet_id" value={data.national_pet_id} onChange={(e) => setField('national_pet_id', e.target.value)} placeholder="ABRADOG-12345-BR" />
              </div>
              <div>
                <Label htmlFor="microchip">Microchip <Vis pub /></Label>
                <Input id="microchip" value={data.microchip} onChange={(e) => setField('microchip', e.target.value)} placeholder="985112004523..." maxLength={15} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="shelter_internal_id">ID do abrigo <Vis /></Label>
                <Input id="shelter_internal_id" value={data.shelter_internal_id} onChange={(e) => setField('shelter_internal_id', e.target.value)} placeholder="Número interno do abrigo (opcional)" maxLength={40} />
              </div>
            </div>
          </fieldset>

          {/* ── CARACTERÍSTICAS ────────────────────────────────────────── */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Características</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="species">Espécie * <Vis pub /></Label>
                <Select value={data.species} onValueChange={(v) => setField('species', v)}>
                  <SelectTrigger id="species"><SelectValue /></SelectTrigger>
                  <SelectContent>{SPECIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="breed">Raça <Vis /></Label>
                <Input id="breed" value={data.breed} onChange={(e) => setField('breed', e.target.value)} placeholder="SRD, Labrador..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="size">Porte * <Vis pub /></Label>
                <Select value={data.size} onValueChange={(v) => setField('size', v)}>
                  <SelectTrigger id="size"><SelectValue /></SelectTrigger>
                  <SelectContent>{SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age_group">Idade * <Vis pub /></Label>
                <Select value={data.age_group} onValueChange={(v) => setField('age_group', v)}>
                  <SelectTrigger id="age_group"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="apparent_age_years">Idade aparente (anos) * <Vis pub /></Label>
                <Input id="apparent_age_years" type="number" min="0" step="0.5" value={data.apparent_age_years} onChange={(e) => setField('apparent_age_years', e.target.value)} aria-invalid={!!errors.apparent_age_years} />
                {errors.apparent_age_years && <p className="mt-1 text-xs text-destructive">{errors.apparent_age_years}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="birth_date">Data de nascimento <Vis /></Label>
                <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => setField('birth_date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <Label htmlFor="gender">Sexo * <Vis pub /></Label>
                <Select value={data.gender} onValueChange={(v) => setField('gender', v)}>
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Macho</SelectItem>
                    <SelectItem value="female">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="energy_level">Energia * <Vis pub /></Label>
                <Select value={data.energy_level} onValueChange={(v) => setField('energy_level', v)}>
                  <SelectTrigger id="energy_level"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENERGIES.map((en) => <SelectItem key={en.value} value={en.value}>{en.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* ── INFORMAÇÕES DE SAÚDE ───────────────────────────────────── */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações de saúde</legend>
            <div>
              <Label htmlFor="health_notes">Observações de saúde * <Vis pub /></Label>
              <Textarea id="health_notes" value={data.health_notes} onChange={(e) => setField('health_notes', e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-3 items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={data.neutered} onChange={(e) => setField('neutered', e.target.checked)} className="h-4 w-4 rounded border-input" />
                Castrado <Vis pub />
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={data.dewormed} onChange={(e) => setField('dewormed', e.target.checked)} className="h-4 w-4 rounded border-input" />
                Vermifugado <Vis pub />
              </label>
              <div>
                <Label htmlFor="vaccinated">Vacinado * <Vis pub /></Label>
                <Select value={data.vaccinated} onValueChange={(v) => setField('vaccinated', v)}>
                  <SelectTrigger id="vaccinated"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* ── INFORMAÇÕES DO ABRIGO ──────────────────────────────────── */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações do abrigo</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rescue_name">Nome de resgate <Vis /></Label>
                <Input id="rescue_name" value={data.rescue_name} onChange={(e) => setField('rescue_name', e.target.value)} placeholder="Título dado pelo resgatante" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="rescue_responsible_name">Responsável pelo resgate * <Vis /></Label>
                <Input id="rescue_responsible_name" value={data.rescue_responsible_name} onChange={(e) => setField('rescue_responsible_name', e.target.value)} placeholder="Nome de quem resgatou" maxLength={120} />
              </div>
            </div>
            <div>
              <Label htmlFor="rescue_address">Local do resgate (texto) * <Vis /></Label>
              <Input id="rescue_address" value={data.rescue_address} onChange={(e) => setField('rescue_address', e.target.value)} placeholder="Rua, bairro, ponto de referência" />
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div>
                <Label htmlFor="rescue_lat">Latitude (GPS)</Label>
                <Input id="rescue_lat" type="number" step="any" value={data.rescue_lat} onChange={(e) => setField('rescue_lat', e.target.value)} placeholder="-30.0346" />
              </div>
              <div>
                <Label htmlFor="rescue_lng">Longitude (GPS)</Label>
                <Input id="rescue_lng" type="number" step="any" value={data.rescue_lng} onChange={(e) => setField('rescue_lng', e.target.value)} placeholder="-51.2177" />
              </div>
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
                Minha localização
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status">Status * <Vis pub /></Label>
                <Select value={data.status} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Última alteração do status <Vis pub /></Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {statusDate || '— (registrado ao mudar o status)'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dias no abrigo (automático) <Vis /></Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {dias ?? '—'}
                </div>
              </div>
              <div>
                <Label htmlFor="current_location">Localização atual * <Vis /></Label>
                <Select value={data.current_location || undefined} onValueChange={(v) => setField('current_location', v)}>
                  <SelectTrigger id="current_location"><SelectValue placeholder="Onde o animal está" /></SelectTrigger>
                  <SelectContent>{CURRENT_LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{CURRENT_LOCATION_LABELS[loc] || loc}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="current_location_notes">Detalhe da localização atual <Vis /></Label>
              <Input id="current_location_notes" value={data.current_location_notes} onChange={(e) => setField('current_location_notes', e.target.value)} placeholder="Ex: lar temporário da Maria; clínica VetX" maxLength={280} />
            </div>
            <div>
              <Label htmlFor="legal_process_number">Processo judicial * <Vis /></Label>
              <Input id="legal_process_number" value={data.legal_process_number} onChange={(e) => setField('legal_process_number', e.target.value)} placeholder="Número do processo (vazio se não houver)" maxLength={60} />
            </div>
            <div>
              <Label htmlFor="observations">Observações * <Vis /></Label>
              <Textarea id="observations" value={data.observations} onChange={(e) => setField('observations', e.target.value)} rows={3} placeholder="Observações internas sobre o animal" />
            </div>
          </fieldset>

          {/* ── OUTRAS INFORMAÇÕES ─────────────────────────────────────── */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Outras informações</legend>
            <div>
              <Label htmlFor="description">Descrição * <Vis pub /></Label>
              <Textarea id="description" value={data.description} onChange={(e) => setField('description', e.target.value)} rows={3} placeholder="Personalidade, história, convivência..." />
            </div>
            <div>
              <Label htmlFor="special_needs">Necessidades especiais * <Vis pub /></Label>
              <Textarea id="special_needs" value={data.special_needs} onChange={(e) => setField('special_needs', e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor="adoption_requirements">Requisitos para adoção * <Vis pub /></Label>
              <Textarea id="adoption_requirements" value={data.adoption_requirements} onChange={(e) => setField('adoption_requirements', e.target.value)} rows={2} />
            </div>
          </fieldset>

          <DialogFooter className="gap-2">
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
