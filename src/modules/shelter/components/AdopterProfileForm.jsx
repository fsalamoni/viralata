/**
 * @fileoverview Componente: AdopterProfileForm (Fase 4).
 *
 * Formulário completo do perfil do adotante. Editável em qualquer
 * momento — campos são salvos com debounce ou via botão "Salvar".
 *
 * Feature flag: `shelter_adopter_full_profile` (default OFF).
 *  - OFF: usuário usa só `applicant_form` mínimo no application
 *  - ON: vê esta página em /profile/adopter com completude (0-100%)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 4
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  HOME_TYPES,
  LIVING_ARRANGEMENTS,
  PET_EXPERIENCE_LEVELS,
} from '@/modules/shelter/domain/operational/adopterProfile';
import {
  useAdopterProfile,
  useCreateAdopterProfile,
  useUpdateAdopterProfile,
} from '@/modules/shelter/hooks/useAdopterProfile';

const HOME_TYPE_LABELS = {
  house: 'Casa', apartment: 'Apartamento', rural: 'Rural',
  shared: 'Compartilhado', other: 'Outro',
};
const LIVING_ARRANGEMENT_LABELS = {
  house_owned: 'Casa própria', house_rented: 'Casa alugada',
  apartment_owned: 'Apto próprio', apartment_rented: 'Apto alugado',
  rural_property: 'Propriedade rural', other: 'Outro',
};
const EXPERIENCE_LABELS = {
  none: 'Nunca tive pet', beginner: 'Iniciante (1-2 pets)',
  intermediate: 'Intermediário', experienced: 'Experiente',
  professional: 'Profissional',
};
const INCOME_LABELS = {
  lt_2k: 'Até R$ 2k', '2k_5k': 'R$ 2k-5k', '5k_10k': 'R$ 5k-10k',
  '10k_20k': 'R$ 10k-20k', gt_20k: 'Mais de R$ 20k', prefer_not_say: 'Prefiro não dizer',
};

export function AdopterProfileForm({ actorUid, actorDisplayName }) {
  const { data: profile, isLoading } = useAdopterProfile(actorUid);
  const createMutation = useCreateAdopterProfile();
  const updateMutation = useUpdateAdopterProfile(actorUid);
  const { toast } = useToast();

  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile && draft === null) {
      setDraft(profile);
    }
  }, [profile, draft]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando perfil…</p>;
  }

  const isCreating = !profile;
  const completeness = draft?.profile_completeness ?? 0;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const handleAddress = (sub, value) => {
    setDraft((d) => ({ ...d, address: { ...(d.address || {}), [sub]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft?.full_name || draft.full_name.length < 2) {
      setErrors({ full_name: 'Nome é obrigatório (mínimo 2 letras)' });
      return;
    }
    try {
      if (isCreating) {
        await createMutation.mutateAsync({
          input: { full_name: draft.full_name, ...draft },
          actor: { uid: actorUid, displayName: actorDisplayName },
        });
        toast({ title: 'Perfil criado.' });
      } else {
        const delta = _delta(profile, draft);
        if (Object.keys(delta).length === 0) {
          toast({ title: 'Nada para salvar.' });
          return;
        }
        await updateMutation.mutateAsync({
          updates: delta,
          actor: { uid: actorUid, displayName: actorDisplayName },
        });
        toast({ title: 'Perfil atualizado.' });
      }
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="arena-section-card-title">Perfil do Adotante</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Quanto mais completo, mais rápido o abrigo te conhece.
              </p>
            </div>
            <Badge variant={completeness === 100 ? 'default' : 'secondary'}>
              {completeness}% completo
            </Badge>
          </div>
        </div>
        <div className="arena-section-card-body space-y-6">
          {/* Identidade */}
          <Section title="Identidade">
            <Field id="full_name" label="Nome completo" required>
              <Input
                id="full_name"
                value={draft?.full_name || ''}
                onChange={(e) => handleChange('full_name', e.target.value)}
                maxLength={120}
                required
              />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field id="cpf" label="CPF">
                <Input
                  id="cpf"
                  value={draft?.cpf || ''}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </Field>
              <Field id="birth_date" label="Data de nascimento">
                <Input
                  id="birth_date"
                  type="date"
                  value={draft?.birth_date || ''}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field id="phone" label="Telefone (com DDD)">
                <Input
                  id="phone"
                  value={draft?.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </Field>
              <Field id="email" label="E-mail">
                <Input
                  id="email"
                  type="email"
                  value={draft?.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Endereço */}
          <Section title="Endereço">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="cep" label="CEP">
                <Input
                  id="cep"
                  value={draft?.address?.cep || ''}
                  onChange={(e) => handleAddress('cep', e.target.value)}
                  placeholder="00000-000"
                />
              </Field>
              <Field id="city" label="Cidade">
                <Input
                  id="city"
                  value={draft?.address?.city || ''}
                  onChange={(e) => handleAddress('city', e.target.value)}
                />
              </Field>
              <Field id="state" label="UF">
                <Input
                  id="state"
                  value={draft?.address?.state || ''}
                  onChange={(e) => handleAddress('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="SP"
                />
              </Field>
            </div>
          </Section>

          {/* Sobre a casa */}
          <Section title="Sobre a casa">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field id="home_type" label="Tipo">
                <Select
                  id="home_type"
                  value={draft?.home_type || ''}
                  onChange={(v) => handleChange('home_type', v || null)}
                  options={[{ value: '', label: '—' }, ...Object.entries(HOME_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
                />
              </Field>
              <Field id="living_arrangement" label="Situação">
                <Select
                  id="living_arrangement"
                  value={draft?.living_arrangement || ''}
                  onChange={(v) => handleChange('living_arrangement', v || null)}
                  options={[{ value: '', label: '—' }, ...Object.entries(LIVING_ARRANGEMENT_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Checkbox
                id="has_yard"
                label="Tem quintal"
                checked={Boolean(draft?.has_yard)}
                onChange={(v) => handleChange('has_yard', v)}
              />
              <Checkbox
                id="has_fence"
                label="Quintal cercado/murado"
                checked={Boolean(draft?.has_fence)}
                onChange={(v) => handleChange('has_fence', v)}
              />
              <Checkbox
                id="landlord_allows_pets"
                label="Locador permite pets"
                checked={Boolean(draft?.landlord_allows_pets)}
                onChange={(v) => handleChange('landlord_allows_pets', v)}
              />
            </div>
          </Section>

          {/* Composição familiar */}
          <Section title="Composição familiar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="household_size" label="Total na casa">
                <Input
                  id="household_size"
                  type="number"
                  min={1}
                  max={50}
                  value={draft?.household_size ?? ''}
                  onChange={(e) => handleChange('household_size', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field id="household_adults" label="Adultos">
                <Input
                  id="household_adults"
                  type="number"
                  min={0}
                  max={50}
                  value={draft?.household_adults ?? ''}
                  onChange={(e) => handleChange('household_adults', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field id="household_children" label="Crianças">
                <Input
                  id="household_children"
                  type="number"
                  min={0}
                  max={50}
                  value={draft?.household_children ?? ''}
                  onChange={(e) => handleChange('household_children', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            </div>
            <Checkbox
              id="household_all_agree"
              label="Todos na casa concordam com a adoção"
              checked={Boolean(draft?.household_all_agree)}
              onChange={(v) => handleChange('household_all_agree', v)}
            />
          </Section>

          {/* Experiência */}
          <Section title="Experiência com pets">
            <Field id="pet_experience_level" label="Nível de experiência">
              <Select
                id="pet_experience_level"
                value={draft?.pet_experience_level || ''}
                onChange={(v) => handleChange('pet_experience_level', v || null)}
                options={[{ value: '', label: '—' }, ...Object.entries(EXPERIENCE_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
              />
            </Field>
            <Field id="years_of_experience" label="Anos de experiência (opcional)">
              <Input
                id="years_of_experience"
                type="number"
                min={0}
                max={80}
                value={draft?.years_of_experience ?? ''}
                onChange={(e) => handleChange('years_of_experience', e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Checkbox
              id="had_pets_before"
              label="Já tive pets antes"
              checked={Boolean(draft?.had_pets_before)}
              onChange={(v) => handleChange('had_pets_before', v)}
            />
            {draft?.had_pets_before && (
              <Field id="previous_pets_deceased_or_given" label="O que aconteceu com eles?">
                <Textarea
                  id="previous_pets_deceased_or_given"
                  value={draft?.previous_pets_deceased_or_given || ''}
                  onChange={(e) => handleChange('previous_pets_deceased_or_given', e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
              </Field>
            )}
          </Section>

          {/* Recursos */}
          <Section title="Recursos">
            <Field id="monthly_income_range" label="Faixa de renda mensal">
              <Select
                id="monthly_income_range"
                value={draft?.monthly_income_range || ''}
                onChange={(v) => handleChange('monthly_income_range', v || null)}
                options={[{ value: '', label: '—' }, ...Object.entries(INCOME_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Checkbox
                id="willing_to_spend_vet"
                label="Disposto a gastar com veterinário"
                checked={Boolean(draft?.willing_to_spend_vet)}
                onChange={(v) => handleChange('willing_to_spend_vet', v)}
              />
              <Checkbox
                id="has_vet_reference"
                label="Tem veterinário de referência"
                checked={Boolean(draft?.has_vet_reference)}
                onChange={(v) => handleChange('has_vet_reference', v)}
              />
            </div>
            {draft?.has_vet_reference && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field id="vet_name" label="Nome do veterinário">
                  <Input
                    id="vet_name"
                    value={draft?.vet_name || ''}
                    onChange={(e) => handleChange('vet_name', e.target.value)}
                  />
                </Field>
                <Field id="vet_phone" label="Telefone do veterinário">
                  <Input
                    id="vet_phone"
                    value={draft?.vet_phone || ''}
                    onChange={(e) => handleChange('vet_phone', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Sobre a adoção */}
          <Section title="Sobre a adoção">
            <Field id="adoption_reason" label="Por que quer adotar?">
              <Textarea
                id="adoption_reason"
                value={draft?.adoption_reason || ''}
                onChange={(e) => handleChange('adoption_reason', e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Compartilhe um pouco da sua motivação…"
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field id="hours_alone_per_day" label="Horas/dia que o pet ficará sozinho">
                <Input
                  id="hours_alone_per_day"
                  type="number"
                  min={0}
                  max={24}
                  value={draft?.hours_alone_per_day ?? ''}
                  onChange={(e) => handleChange('hours_alone_per_day', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field id="exercise_time_per_day_minutes" label="Minutos de exercício/dia">
                <Input
                  id="exercise_time_per_day_minutes"
                  type="number"
                  min={0}
                  max={600}
                  value={draft?.exercise_time_per_day_minutes ?? ''}
                  onChange={(e) => handleChange('exercise_time_per_day_minutes', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Checkbox
                id="has_transport"
                label="Tem carro/transporte próprio"
                checked={Boolean(draft?.has_transport)}
                onChange={(v) => handleChange('has_transport', v)}
              />
            </div>
          </Section>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando…' : isCreating ? 'Criar perfil' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </section>
    </form>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ id, label, required, children }) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}

function Select({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Checkbox({ id, label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}

function _delta(oldObj, newObj) {
  if (!oldObj) return newObj || {};
  const out = {};
  for (const k of Object.keys(newObj || {})) {
    if (JSON.stringify(newObj[k]) !== JSON.stringify(oldObj[k])) {
      out[k] = newObj[k] === '' ? null : newObj[k];
    }
  }
  return out;
}
