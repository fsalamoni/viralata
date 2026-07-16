/**
 * @fileoverview Componente: ParticipationForm (Fase 13).
 *
 * Formulário para o abrigo registrar uma participation de voluntário
 * em um evento/feira/transporte. Valida event_date, role, volunteer.
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF, ENFORCED at runtime).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  VOLUNTEER_PARTICIPATION_ROLES,
  VOLUNTEER_PARTICIPATION_ROLE_LABELS,
  VOLUNTEER_PARTICIPATION_EVENT_TYPES,
  VOLUNTEER_PARTICIPATION_EVENT_TYPE_LABELS,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import { useCreateParticipation } from '@/modules/shelter/hooks/useVolunteerParticipations';
import { useShelterVolunteers } from '@/modules/shelter/hooks/useVolunteerProfile';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';


function defaultForm(volunteerUid, volunteerName) {
  return {
    volunteer_uid: volunteerUid || '',
    volunteer_name: volunteerName || '',
    event_type: 'exhibition',
    event_id: '',
    exhibition_id: '',
    event_label: '',
    event_date: '',
    role: 'cuidador',
    notes: '',
  };
}

export function ParticipationForm({ shelterClubId, actor, defaultVolunteer, onSaved }) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const [form, setForm] = useState(() => defaultForm(defaultVolunteer?.uid, defaultVolunteer?.name));
  const createMutation = useCreateParticipation();
  const { toast } = useToast();
  const { data: roster = [], isLoading: isLoadingRoster, error: rosterError } = useShelterVolunteers(
    shelterClubId,
    { status: 'active' },
  );

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleVolunteerChange = (volunteerUid) => {
    const v = roster.find((r) => r.id === volunteerUid || r.volunteer_uid === volunteerUid);
    setForm((prev) => ({
      ...prev,
      volunteer_uid: volunteerUid,
      volunteer_name: v?.volunteer_name || prev.volunteer_name,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.volunteer_uid || !form.volunteer_name) {
      toast({ title: 'Selecione um voluntário da rostagem.', variant: 'destructive' });
      return;
    }
    if (!form.event_label || !form.event_date) {
      toast({ title: 'Preencha o nome e a data do evento.', variant: 'destructive' });
      return;
    }
    try {
      const input = {
        shelter_club_id: shelterClubId,
        volunteer_uid: form.volunteer_uid,
        volunteer_name: form.volunteer_name,
        event_type: form.event_type,
        event_id: form.event_id.trim() || undefined,
        exhibition_id: form.exhibition_id.trim() || undefined,
        event_label: form.event_label.trim(),
        event_date: new Date(form.event_date).toISOString(),
        role: form.role,
        notes: form.notes.trim() || undefined,
      };
      await createMutation.mutateAsync({ input, actor });
      toast({ title: '✓ Participation registrada.' });
      setForm(defaultForm(defaultVolunteer?.uid, defaultVolunteer?.name));
      if (onSaved) onSaved();
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  if (!isV1Enabled) return null;
  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header"><h3 className="arena-section-card-title">Nova participation</h3></div>
      <div className="arena-section-card-body">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="volunteer_uid">Voluntário</Label>
              {rosterError ? (
                <p className="text-sm text-red-700">Erro ao carregar rostagem.</p>
              ) : (
                <Select
                  value={form.volunteer_uid || undefined}
                  onValueChange={handleVolunteerChange}
                  disabled={isLoadingRoster}
                >
                  <SelectTrigger id="volunteer_uid">
                    <SelectValue placeholder={isLoadingRoster ? 'Carregando…' : 'Selecione um voluntário'} />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.length === 0 && !isLoadingRoster && (
                      <SelectItem value="__empty__" disabled>
                        Nenhum voluntário ativo na rostagem
                      </SelectItem>
                    )}
                    {roster.map((v) => {
                      const vid = v.id || v.volunteer_uid;
                      return (
                        <SelectItem key={vid} value={vid}>
                          {v.volunteer_name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="event_type">Tipo de evento</Label>
              <select
                id="event_type"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.event_type}
                onChange={(e) => update('event_type', e.target.value)}
              >
                {VOLUNTEER_PARTICIPATION_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{VOLUNTEER_PARTICIPATION_EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="event_label">Nome do evento</Label>
              <Input
                id="event_label"
                value={form.event_label}
                onChange={(e) => update('event_label', e.target.value)}
                placeholder="Vitrine da Praça XV"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="event_date">Data e hora</Label>
              <Input
                id="event_date"
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => update('event_date', e.target.value)}
                required
              />
            </div>
          </div>

          {form.event_type === 'exhibition' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exhibition_id">ID da Vitrine (Fase 11)</Label>
                <Input
                  id="exhibition_id"
                  value={form.exhibition_id}
                  onChange={(e) => update('exhibition_id', e.target.value)}
                  placeholder="opcional"
                  maxLength={128}
                />
              </div>
              <div>
                <Label htmlFor="event_id">ID genérico (outro)</Label>
                <Input
                  id="event_id"
                  value={form.event_id}
                  onChange={(e) => update('event_id', e.target.value)}
                  placeholder="opcional"
                  maxLength={128}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="role">Papel</Label>
            <select
              id="role"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
            >
              {VOLUNTEER_PARTICIPATION_ROLES.map((r) => (
                <option key={r} value={r}>{VOLUNTEER_PARTICIPATION_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              className="w-full border rounded p-2 text-sm min-h-[60px]"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              maxLength={2000}
              placeholder="Detalhes do turno, combinados, etc."
            />
          </div>

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando…' : 'Registrar participation'}
          </Button>
        </form>
      </div>
    </section>
  );
}
