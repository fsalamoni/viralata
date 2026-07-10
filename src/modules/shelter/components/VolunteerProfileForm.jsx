/**
 * @fileoverview Componente: VolunteerProfileForm (Fase 13).
 *
 * Formulário completo do perfil de voluntário. Editável em qualquer
 * momento (cria uma vez, depois atualiza).
 *
 * Feature flag: `shelter_volunteers` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (voluntários)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  DAY_OF_WEEK,
  DAY_OF_WEEK_LABELS,
  VOLUNTEER_SKILL_SUGGESTIONS,
} from '@/modules/shelter/domain/operational/volunteer';
import {
  useMyVolunteerProfile,
  useCreateVolunteerProfile,
  useUpdateVolunteerProfile,
  useDeleteVolunteerProfile,
} from '@/modules/shelter/hooks/useVolunteers';

const EMPTY_AVAILABILITY = { day_of_week: 'saturday', from: '08:00', to: '18:00' };
const EMPTY_CERT = { name: '', issuer: '', year: '' };

export function VolunteerProfileForm({ userId, actor }) {
  const { data: profile, isLoading } = useMyVolunteerProfile(userId);
  const createMutation = useCreateVolunteerProfile();
  const updateMutation = useUpdateVolunteerProfile(userId);
  const deleteMutation = useDeleteVolunteerProfile(userId);
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hidrata estado local quando o profile carrega
  useEffect(() => {
    if (profile && !hydrated) {
      setDisplayName(profile.display_name || '');
      setSkills(profile.skills || []);
      setCertifications(profile.certifications || []);
      setAvailability(profile.availability || []);
      setNotes(profile.notes || '');
      setActive(profile.active !== false);
      setHydrated(true);
    }
  }, [profile, hydrated]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">userId ausente.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando perfil…</p>;

  const isNew = !profile;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const toggleSkill = (skill) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };
  const addCustomSkill = () => {
    const v = customSkill.trim();
    if (!v) return;
    if (!skills.includes(v)) setSkills([...skills, v]);
    setCustomSkill('');
  };

  const addCert = () => setCertifications([...certifications, { ...EMPTY_CERT }]);
  const updateCert = (idx, patch) => {
    setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };
  const removeCert = (idx) => {
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAvailability = () => setAvailability([...availability, { ...EMPTY_AVAILABILITY }]);
  const updateAvailability = (idx, patch) => {
    setAvailability((prev) => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  };
  const removeAvailability = (idx) => {
    setAvailability((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!displayName || displayName.trim().length < 2) {
      toast({ title: 'Nome deve ter pelo menos 2 caracteres.', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: userId,
      display_name: displayName.trim(),
      skills,
      certifications: certifications.filter((c) => c.name && c.name.trim().length >= 2)
        .map((c) => ({
          name: c.name.trim(),
          issuer: c.issuer?.trim() || undefined,
          year: c.year ? Number(c.year) : undefined,
        })),
      availability: availability.filter((a) => a.from && a.to && a.from < a.to),
      notes: notes?.trim() || undefined,
      active,
    };
    try {
      if (isNew) {
        await createMutation.mutateAsync({ userId, input: payload, actor });
        toast({ title: '✓ Perfil de voluntário criado.' });
      } else {
        await updateMutation.mutateAsync({ patch: payload, actor });
        toast({ title: '✓ Perfil atualizado.' });
      }
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDeactivate = async () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Desativar perfil de voluntário? Você deixará de aparecer nas convocações.')) return;
    try {
      await deleteMutation.mutateAsync({ actor });
      setActive(false);
      toast({ title: 'Perfil desativado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{isNew ? 'Cadastro de Voluntário' : 'Meu Perfil de Voluntário'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isNew
                ? 'Preencha suas habilidades, certificações e disponibilidade.'
                : 'Edite seus dados a qualquer momento.'}
            </p>
          </div>
          {!isNew && (
            <Badge className={active ? 'bg-green-100 text-green-900' : 'bg-zinc-100 text-zinc-700'}>
              {active ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome */}
        <div className="space-y-1">
          <Label htmlFor="vol-name">Nome de exibição</Label>
          <Input
            id="vol-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Como você quer ser chamado nas convocações"
            maxLength={120}
          />
        </div>

        {/* Skills */}
        <div className="space-y-1">
          <Label>Habilidades</Label>
          <p className="text-xs text-muted-foreground mb-1">
            Marque as que você tem. Adicione outras customizadas se precisar.
          </p>
          <div className="flex flex-wrap gap-1">
            {VOLUNTEER_SKILL_SUGGESTIONS.map((s) => {
              const checked = skills.includes(s);
              return (
                <button
                  key={s} type="button"
                  onClick={() => toggleSkill(s)}
                  className={
                    'rounded-full border px-2 py-1 text-xs ' +
                    (checked
                      ? 'border-orange-500 bg-orange-100 text-orange-900'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted')
                  }
                  aria-pressed={checked}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Outra habilidade"
              maxLength={60}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
            />
            <Button type="button" size="sm" variant="outline" onClick={addCustomSkill}>
              Adicionar
            </Button>
          </div>
        </div>

        {/* Certifications */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Certificações</Label>
            <Button size="sm" variant="outline" onClick={addCert}>+ Certificação</Button>
          </div>
          {certifications.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma cadastrada.</p>
          )}
          <ol className="space-y-2">
            {certifications.map((c, i) => (
              <li key={i} className="rounded border border-border p-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5 space-y-1">
                  <Label htmlFor={`cert-name-${i}`} className="text-xs">Nome</Label>
                  <Input
                    id={`cert-name-${i}`}
                    value={c.name}
                    onChange={(e) => updateCert(i, { name: e.target.value })}
                    placeholder="Ex.: Curso de primeiros socorros animal"
                    maxLength={200}
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label htmlFor={`cert-issuer-${i}`} className="text-xs">Emissor (opcional)</Label>
                  <Input
                    id={`cert-issuer-${i}`}
                    value={c.issuer}
                    onChange={(e) => updateCert(i, { issuer: e.target.value })}
                    placeholder="ONG / instituição"
                    maxLength={200}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor={`cert-year-${i}`} className="text-xs">Ano</Label>
                  <Input
                    id={`cert-year-${i}`}
                    type="number"
                    value={c.year}
                    onChange={(e) => updateCert(i, { year: e.target.value })}
                    placeholder="2024"
                    min={1950}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeCert(i)}>×</Button>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Availability */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Disponibilidade semanal</Label>
            <Button size="sm" variant="outline" onClick={addAvailability}>+ Horário</Button>
          </div>
          {availability.length === 0 && (
            <p className="text-xs text-muted-foreground">Sem horários cadastrados.</p>
          )}
          <ol className="space-y-2">
            {availability.map((a, i) => (
              <li key={i} className="rounded border border-border p-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-5 space-y-1">
                  <Label htmlFor={`avail-day-${i}`} className="text-xs">Dia</Label>
                  <select
                    id={`avail-day-${i}`}
                    className="w-full rounded border border-border px-2 py-1 text-sm"
                    value={a.day_of_week}
                    onChange={(e) => updateAvailability(i, { day_of_week: e.target.value })}
                  >
                    {DAY_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{DAY_OF_WEEK_LABELS[d]}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor={`avail-from-${i}`} className="text-xs">De</Label>
                  <Input
                    id={`avail-from-${i}`}
                    type="time"
                    value={a.from}
                    onChange={(e) => updateAvailability(i, { from: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor={`avail-to-${i}`} className="text-xs">Até</Label>
                  <Input
                    id={`avail-to-${i}`}
                    type="time"
                    value={a.to}
                    onChange={(e) => updateAvailability(i, { to: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeAvailability(i)}>×</Button>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor="vol-notes">Observações (opcional)</Label>
          <Textarea
            id="vol-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Disponível para turnos longos, tenho carro, etc."
            rows={3}
            maxLength={2000}
          />
        </div>

        {/* Active (só no edit) */}
        {!isNew && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="vol-active"
              checked={active}
              onCheckedChange={(v) => setActive(Boolean(v))}
            />
            <Label htmlFor="vol-active" className="text-sm cursor-pointer">
              Perfil ativo (visível para convocações)
            </Label>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando…' : (isNew ? 'Criar perfil' : 'Salvar alterações')}
          </Button>
          {!isNew && active && (
            <Button variant="outline" onClick={handleDeactivate} disabled={isDeleting}>
              {isDeleting ? 'Desativando…' : 'Desativar perfil'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
