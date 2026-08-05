/**
 * @fileoverview PetEditForm — dialog completo de edição do pet.
 *
 * TASK-V3-PET-DETAIL-FULL-EDIT: edita campos do pet incluindo
 * pet_code, national_pet_id, microchip, e todos os outros campos
 * (nome, raça, status, tamanho, idade, etc).
 *
 * Apenas canManage (owner + clube) pode editar.
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
  name: '',
  title: '',
  species: 'dog',
  breed: '',
  size: 'medium',
  age_group: 'adult',
  age_months: '',
  gender: 'male',
  energy_level: 'medium',
  status: 'available',
  description: '',
  city: '',
  state: '',
  health_notes: '',
  special_needs: '',
  neutered: false,
  vaccinated: 'no',
  dewormed: false,
  pet_code: '',
  national_pet_id: '',
  microchip: '',
  adoption_requirements: '',
  // ── Resgate / operacional INTERNO do abrigo (não vão para a página pública) ──
  rescue_name: '',
  rescue_date: '',
  rescue_responsible_name: '',
  rescue_address: '',
  rescue_city: '',
  rescue_state: '',
  rescue_lat: '',
  rescue_lng: '',
  birth_date: '',
  current_location: '',
  current_location_notes: '',
  legal_process_number: '',
  observations: '',
};

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
        species: pet.species || 'dog',
        breed: pet.breed || '',
        size: pet.size || 'medium',
        age_group: pet.age_group || 'adult',
        age_months: pet.age_months ? String(pet.age_months) : '',
        gender: pet.gender || 'male',
        energy_level: pet.energy_level || 'medium',
        status: pet.status || 'available',
        description: pet.description || '',
        city: pet.city || '',
        state: pet.state || '',
        health_notes: pet.health_notes || '',
        special_needs: pet.special_needs || '',
        neutered: Boolean(pet.neutered),
        vaccinated: pet.vaccinated || 'no',
        dewormed: Boolean(pet.dewormed),
        pet_code: pet.pet_code || '',
        national_pet_id: pet.national_pet_id || '',
        microchip: pet.microchip || '',
        adoption_requirements: pet.adoption_requirements || '',
        rescue_name: pet.rescue_name || '',
        rescue_date: (pet.rescue_date || '').slice(0, 10),
        rescue_responsible_name: pet.rescue_responsible_name || '',
        rescue_address: pet.rescue_address || '',
        rescue_city: pet.rescue_city || '',
        rescue_state: pet.rescue_state || '',
        rescue_lat: pet.rescue_lat ?? '',
        rescue_lng: pet.rescue_lng ?? '',
        birth_date: (pet.birth_date || '').slice(0, 10),
        current_location: pet.current_location || '',
        current_location_notes: pet.current_location_notes || '',
        legal_process_number: pet.legal_process_number || '',
        observations: pet.observations || '',
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
    if (!data.name || data.name.trim().length < 2) {
      errs.name = 'Nome do pet é obrigatório (≥ 2 caracteres)';
    }
    if (data.age_months && isNaN(Number(data.age_months))) {
      errs.age_months = 'Idade deve ser um número';
    }
    setErrors(errs);
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
      age_months: data.age_months ? Number(data.age_months) : null,
      rescue_lat: toNum(data.rescue_lat),
      rescue_lng: toNum(data.rescue_lng),
      rescue_date: data.rescue_date || null,
      birth_date: data.birth_date || null,
    };
    // Data do status (interno): registra quando o status mudou.
    if (data.status !== pet?.status) {
      updates.status_changed_at = new Date().toISOString();
    }
    // Remover pet_code do updates se o user não mudou (write-once pode ser)
    if (updates.pet_code === pet?.pet_code) delete updates.pet_code;
    try {
      await updateMut.mutateAsync({ petId: pet.id, updates });
      // Backfill do número de resgate: pets de abrigo sem número recebem um
      // (sequencial por abrigo/espécie/ano). Não bloqueia o sucesso.
      if (pet?.owner_type === 'organization' && pet?.owner_id && !pet?.rescue_number) {
        try {
          await assignRescueNumber(pet.id, {
            clubId: pet.owner_id,
            species: data.species,
            actor: { uid: user?.uid, email: user?.email },
            date: updates.rescue_date || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" aria-hidden="true" />
            Editar pet
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do pet. Apenas o responsável e membros do abrigo podem editar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identidade */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Identidade</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={data.name} onChange={(e) => setField('name', e.target.value)} aria-invalid={!!errors.name} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={data.title} onChange={(e) => setField('title', e.target.value)} placeholder="Apelido carinhoso" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pet_code">ID interno</Label>
                <Input id="pet_code" value={data.pet_code} onChange={(e) => setField('pet_code', e.target.value)} placeholder="VLT-000123" />
                <p className="mt-1 text-[10.5px] text-muted-foreground">Gerado pelo sistema</p>
              </div>
              <div>
                <Label htmlFor="national_pet_id">RG (nacional)</Label>
                <Input id="national_pet_id" value={data.national_pet_id} onChange={(e) => setField('national_pet_id', e.target.value)} placeholder="ABRADOG-12345-BR" />
              </div>
              <div>
                <Label htmlFor="microchip">Microchip</Label>
                <Input id="microchip" value={data.microchip} onChange={(e) => setField('microchip', e.target.value)} placeholder="985112004523..." maxLength={15} />
              </div>
            </div>
          </fieldset>

          {/* Características */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Características</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="species">Espécie</Label>
                <Select value={data.species} onValueChange={(v) => setField('species', v)}>
                  <SelectTrigger id="species"><SelectValue /></SelectTrigger>
                  <SelectContent>{SPECIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="breed">Raça</Label>
                <Input id="breed" value={data.breed} onChange={(e) => setField('breed', e.target.value)} placeholder="SRD, Labrador..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="size">Porte</Label>
                <Select value={data.size} onValueChange={(v) => setField('size', v)}>
                  <SelectTrigger id="size"><SelectValue /></SelectTrigger>
                  <SelectContent>{SIZES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age_group">Idade</Label>
                <Select value={data.age_group} onValueChange={(v) => setField('age_group', v)}>
                  <SelectTrigger id="age_group"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age_months">Meses</Label>
                <Input id="age_months" type="number" min="0" value={data.age_months} onChange={(e) => setField('age_months', e.target.value)} aria-invalid={!!errors.age_months} />
                {errors.age_months && <p className="mt-1 text-xs text-destructive">{errors.age_months}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="gender">Sexo</Label>
                <Select value={data.gender} onValueChange={(v) => setField('gender', v)}>
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Macho</SelectItem>
                    <SelectItem value="female">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="energy_level">Energia</Label>
                <Select value={data.energy_level} onValueChange={(v) => setField('energy_level', v)}>
                  <SelectTrigger id="energy_level"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENERGIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={data.status} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={data.neutered} onChange={(e) => setField('neutered', e.target.checked)} className="h-4 w-4 rounded border-input" />
                Castrado
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={data.dewormed} onChange={(e) => setField('dewormed', e.target.checked)} className="h-4 w-4 rounded border-input" />
                Vermifugado
              </label>
              <div>
                <Label htmlFor="vaccinated">Vacinado</Label>
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

          {/* Localização */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Localização</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={data.city} onChange={(e) => setField('city', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">UF</Label>
                <Input id="state" value={data.state} onChange={(e) => setField('state', e.target.value.toUpperCase().substring(0, 2))} maxLength={2} placeholder="RS" />
              </div>
            </div>
          </fieldset>

          {/* Resgate / Operacional (interno do abrigo) */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Resgate / Operacional (interno)</legend>
            <p className="rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              Dados internos do abrigo — não aparecem na página pública do pet.
            </p>
            {/* Número de resgate + dias no abrigo (read-only) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número do resgate</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold tracking-wide">
                  {pet?.rescue_number || '— (gerado ao salvar)'}
                </div>
              </div>
              <div>
                <Label>Dias no abrigo</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {daysInShelter(pet) ?? '—'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rescue_name">Nome do resgate</Label>
                <Input id="rescue_name" value={data.rescue_name} onChange={(e) => setField('rescue_name', e.target.value)} placeholder="Título do resgate" maxLength={200} />
              </div>
              <div>
                <Label htmlFor="rescue_date">Data do resgate</Label>
                <Input id="rescue_date" type="date" value={data.rescue_date} onChange={(e) => setField('rescue_date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div>
              <Label htmlFor="rescue_responsible_name">Responsável pelo resgate</Label>
              <Input id="rescue_responsible_name" value={data.rescue_responsible_name} onChange={(e) => setField('rescue_responsible_name', e.target.value)} placeholder="Nome de quem resgatou" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="rescue_address">Local do resgate</Label>
              <Input id="rescue_address" value={data.rescue_address} onChange={(e) => setField('rescue_address', e.target.value)} placeholder="Rua, bairro, ponto de referência" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rescue_city">Cidade do resgate</Label>
                <Input id="rescue_city" value={data.rescue_city} onChange={(e) => setField('rescue_city', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rescue_state">UF do resgate</Label>
                <Input id="rescue_state" value={data.rescue_state} onChange={(e) => setField('rescue_state', e.target.value.toUpperCase().substring(0, 2))} maxLength={2} placeholder="RS" />
              </div>
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
                <Label htmlFor="birth_date">Data de nascimento (se conhecida)</Label>
                <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => setField('birth_date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <Label htmlFor="current_location">Localização atual</Label>
                <Select value={data.current_location || undefined} onValueChange={(v) => setField('current_location', v)}>
                  <SelectTrigger id="current_location"><SelectValue placeholder="Onde o animal está" /></SelectTrigger>
                  <SelectContent>{CURRENT_LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{CURRENT_LOCATION_LABELS[loc] || loc}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="current_location_notes">Detalhe da localização atual</Label>
              <Input id="current_location_notes" value={data.current_location_notes} onChange={(e) => setField('current_location_notes', e.target.value)} placeholder="Ex: lar temporário da Maria; clínica VetX" maxLength={280} />
            </div>
            <div>
              <Label htmlFor="legal_process_number">Processo judicial (se houver)</Label>
              <Input id="legal_process_number" value={data.legal_process_number} onChange={(e) => setField('legal_process_number', e.target.value)} placeholder="Número do processo" maxLength={60} />
            </div>
            <div>
              <Label htmlFor="observations">Observações internas</Label>
              <Textarea id="observations" value={data.observations} onChange={(e) => setField('observations', e.target.value)} rows={3} placeholder="Observações internas sobre o animal" />
            </div>
          </fieldset>

          {/* Texto */}
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre</legend>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={data.description} onChange={(e) => setField('description', e.target.value)} rows={3} placeholder="Personalidade, história, convivência..." />
            </div>
            <div>
              <Label htmlFor="health_notes">Observações de saúde</Label>
              <Textarea id="health_notes" value={data.health_notes} onChange={(e) => setField('health_notes', e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor="special_needs">Necessidades especiais</Label>
              <Textarea id="special_needs" value={data.special_needs} onChange={(e) => setField('special_needs', e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor="adoption_requirements">Requisitos para adoção</Label>
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
