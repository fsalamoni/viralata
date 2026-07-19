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
    const updates = {
      ...data,
      age_months: data.age_months ? Number(data.age_months) : null,
    };
    // Remover pet_code do updates se o user não mudou (write-once pode ser)
    if (updates.pet_code === pet?.pet_code) delete updates.pet_code;
    try {
      await updateMut.mutateAsync({ petId: pet.id, updates });
      toast.success('Pet atualizado');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
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
