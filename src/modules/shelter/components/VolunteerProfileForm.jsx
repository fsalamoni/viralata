/**
 * @fileoverview Componente: VolunteerProfileForm (Fase 13 + TASK-236).
 *
 * Formulário para o voluntário editar seu perfil global
 * (skills, availability, radius, transporte) E aceitar o termo
 * de voluntariado (LGPD). O aceite do termo é um passo separado
 * — se o usuário ainda não aceitou, o form mostra o texto
 * resumido e exige signature_text antes de permitir o save.
 *
 * Mount points (TASK-236):
 *  1. `/perfil` (src/pages/Profile.jsx) — perfil global do usuário, com
 *     section "Voluntariado". Use `existing` para pular o refetch e
 *     reusar o resultado de `useVolunteerProfile()`.
 *  2. (Futuro) Modal/drawer de contexto onde o componente precisa
 *     renderizar de forma standalone para um uid arbitrário.
 *
 * Props:
 *  - `uid`      — uid do voluntário (default = atual via useAuth quando ausente)
 *  - `actor`    — identidade do caller (usado nos mutates de auditoria)
 *  - `existing` — opcional, profile já carregado pelo pai. Se fornecido,
 *                 o componente não dispara o refetch interno.
 *  - `readOnly` — se true, esconde os botões de save/aceite.
 *  - `onSaved`  — callback após save bem-sucedido.
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF).
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_SKILLS,
  VOLUNTEER_SKILL_LABELS,
  VOLUNTEER_DAYS_OF_WEEK,
  VOLUNTEER_DAY_LABELS,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import {
  VOLUNTEER_TERMS_TEXT,
  VOLUNTEER_TERMS_VERSION,
  getVolunteerTermsLabel,
} from '@/modules/shelter/domain/legal/volunteerTerms';
import {
  useVolunteerProfile,
  useUpsertVolunteerProfile,
  useAcceptVolunteerTerms,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

const EMPTY_AVAILABILITY = {
  day_of_week: 'mon',
  start_time: '08:00',
  end_time: '12:00',
};

export function VolunteerProfileForm({ uid, actor, existing, readOnly = false, onSaved }) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const fetchFromHook = useVolunteerProfile(existing ? null : uid);
  const profile = existing ?? fetchFromHook.data;
  const isLoading = existing ? false : fetchFromHook.isLoading;
  const upsertMutation = useUpsertVolunteerProfile(uid);
  const acceptTermsMutation = useAcceptVolunteerTerms(uid);
  const { toast } = useToast();

  const [skills, setSkills] = useState(() => existing?.skills || []);
  const [availability, setAvailability] = useState(() => existing?.availability || []);
  const [radiusKm, setRadiusKm] = useState(() => (existing?.radius_km != null ? String(existing.radius_km) : ''));
  const [transportAvailable, setTransportAvailable] = useState(() => Boolean(existing?.transport_available));
  const [hasVehicle, setHasVehicle] = useState(() => Boolean(existing?.has_vehicle));
  const [notes, setNotes] = useState(() => existing?.notes || '');
  const [signatureText, setSignatureText] = useState('');

  useEffect(() => {
    if (!existing && profile) {
      setSkills(profile.skills || []);
      setAvailability(profile.availability || []);
      setRadiusKm(profile.radius_km != null ? String(profile.radius_km) : '');
      setTransportAvailable(Boolean(profile.transport_available));
      setHasVehicle(Boolean(profile.has_vehicle));
      setNotes(profile.notes || '');
    }
  }, [profile, existing]);

  const hasAcceptedTerms = Boolean(profile?.terms_accepted_at)
    && profile?.terms_version === VOLUNTEER_TERMS_VERSION;

  const toggleSkill = (skill) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const addAvailability = () => {
    setAvailability((prev) => [...prev, { ...EMPTY_AVAILABILITY }]);
  };
  const removeAvailability = (idx) => {
    setAvailability((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateAvailability = (idx, field, value) => {
    setAvailability((prev) => prev.map((slot, i) => i === idx ? { ...slot, [field]: value } : slot));
  };

  const handleAcceptTerms = async () => {
    if (!signatureText || signatureText.trim().length < 2) {
      toast({ title: 'Digite seu nome completo para assinar.', variant: 'destructive' });
      return;
    }
    try {
      await acceptTermsMutation.mutateAsync({
        acceptance: { terms_version: VOLUNTEER_TERMS_VERSION, signature_text: signatureText.trim() },
        actor,
      });
      toast({ title: '✓ Termo aceito. Obrigado!' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasAcceptedTerms) {
      toast({ title: 'Você precisa aceitar o termo antes de salvar.', variant: 'destructive' });
      return;
    }
    const input = {
      skills,
      availability,
      radius_km: radiusKm === '' ? undefined : Number(radiusKm),
      transport_available: transportAvailable,
      has_vehicle: hasVehicle,
      notes: notes.trim() || undefined,
    };
    try {
      await upsertMutation.mutateAsync({ input, actor });
      toast({ title: '✓ Perfil salvo.' });
      if (onSaved) onSaved();
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  if (!isV1Enabled) return null;
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando perfil…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {!readOnly && !hasAcceptedTerms && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">{getVolunteerTermsLabel()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-900 whitespace-pre-line">{VOLUNTEER_TERMS_TEXT}</p>
            <div className="space-y-1">
              <Label htmlFor="signature">Assinatura (digite seu nome completo)</Label>
              <Input
                id="signature"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Maria Silva"
                maxLength={120}
              />
            </div>
            <Button
              type="button"
              onClick={handleAcceptTerms}
              disabled={acceptTermsMutation.isPending}
            >
              {acceptTermsMutation.isPending ? 'Aceitando…' : 'Aceitar termo'}
            </Button>
            <p className="text-xs text-amber-800">
              ⚠ O aceite é gravado como snapshot (LGPD) e referenciado nas rostagens dos abrigos.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Habilidades</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VOLUNTEER_SKILLS.map((skill) => (
              <label key={skill} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/30">
                <Checkbox
                  checked={skills.includes(skill)}
                  onCheckedChange={() => toggleSkill(skill)}
                />
                <span className="text-sm">{VOLUNTEER_SKILL_LABELS[skill]}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {availability.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
          )}
          {availability.map((slot, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-wrap">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={slot.day_of_week}
                onChange={(e) => updateAvailability(idx, 'day_of_week', e.target.value)}
              >
                {VOLUNTEER_DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{VOLUNTEER_DAY_LABELS[d]}</option>
                ))}
              </select>
              <Input
                type="time"
                className="w-32"
                value={slot.start_time}
                onChange={(e) => updateAvailability(idx, 'start_time', e.target.value)}
              />
              <span className="text-sm text-muted-foreground">até</span>
              <Input
                type="time"
                className="w-32"
                value={slot.end_time}
                onChange={(e) => updateAvailability(idx, 'end_time', e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAvailability(idx)}>
                Remover
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAvailability}>
            + Adicionar horário
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Logística</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="radius">Raio de atuação (km)</Label>
            <Input
              id="radius"
              type="number"
              min="0"
              max="500"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              placeholder="Ex: 20"
            />
          </div>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={transportAvailable}
              onCheckedChange={setTransportAvailable}
            />
            <span className="text-sm">Posso transportar animais</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={hasVehicle}
              onCheckedChange={setHasVehicle}
            />
            <span className="text-sm">Tenho veículo próprio</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardContent>
          <textarea
            className="w-full border rounded p-2 text-sm min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Disponibilidade específica, restrições, observações para os abrigos…"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        {!readOnly && (
          <Button type="submit" disabled={upsertMutation.isPending || !hasAcceptedTerms}>
            {upsertMutation.isPending ? 'Salvando…' : 'Salvar perfil'}
          </Button>
        )}
        {hasAcceptedTerms && (
          <Badge className="bg-green-100 text-green-900">
            ✓ Termo aceito (v{VOLUNTEER_TERMS_VERSION})
          </Badge>
        )}
      </div>
    </form>
  );
}
