import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Trash2, Play, Lock, CheckCircle2, Save } from 'lucide-react';
import {
  useTournamentAdmins,
  useAddTournamentAdmin,
  useRemoveTournamentAdmin,
  useSetTournamentStatus,
  useUpdateTournament,
} from '@/modules/tournament/hooks/useTournament';
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_ADMIN_ROLE,
  RULESET,
  RULESET_LABELS,
  TARGET_SCORE,
  TOURNAMENT_VISIBILITY_LABELS,
} from '@/modules/tournament/domain/constants';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

function buildFormState(tournament) {
  return {
    name: tournament?.name || '',
    description: tournament?.description || '',
    city: tournament?.city || '',
    state: tournament?.state || '',
    venue: tournament?.venue || '',
    visibility: tournament?.visibility || 'private',
    ruleset: tournament?.scoring?.ruleset || tournament?.ruleset || RULESET.CBP,
    target_score: String(tournament?.scoring?.target_score || TARGET_SCORE.ELEVEN),
    sets_per_match: String(tournament?.scoring?.sets_per_match || 1),
    starts_at: tournament?.starts_at || '',
    ends_at: tournament?.ends_at || '',
    registration_deadline: tournament?.registration_deadline || '',
  };
}

export default function TournamentAdminTab({ tournament }) {
  const { data: admins = [] } = useTournamentAdmins(tournament.id);
  const addMutation = useAddTournamentAdmin(tournament.id);
  const removeMutation = useRemoveTournamentAdmin(tournament.id);
  const statusMutation = useSetTournamentStatus(tournament.id);
  const updateMutation = useUpdateTournament(tournament.id);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState(() => buildFormState(tournament));

  useEffect(() => {
    setForm(buildFormState(tournament));
  }, [tournament]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAddAdmin() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Usuário não encontrado. Peça para a pessoa fazer login uma vez na plataforma.');
        return;
      }
      const data = snap.docs[0].data();
      await addMutation.mutateAsync({ uid: data.uid, email: data.email, displayName: data.platform_name || data.full_name });
      toast.success('Admin adicionado.');
      setEmail('');
    } catch (err) {
      toast.error(err.message || 'Falha ao adicionar.');
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Informe o nome do torneio.');
    try {
      await updateMutation.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        venue: form.venue.trim(),
        visibility: form.visibility,
        ruleset: form.ruleset,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        registration_deadline: form.registration_deadline || null,
        scoring: {
          ruleset: form.ruleset,
          target_score: Number(form.target_score),
          sets_per_match: Number(form.sets_per_match),
          win_by_two: tournament?.scoring?.win_by_two ?? true,
        },
      });
      toast.success('Parâmetros do torneio atualizados.');
    } catch (err) {
      toast.error(err.message || 'Falha ao salvar.');
    }
  }

  async function setStatus(s) {
    try {
      await statusMutation.mutateAsync(s);
      toast.success('Status atualizado.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-semibold">Parâmetros do torneio</h4>
              <p className="text-xs text-slate-500">
                Os admins podem ajustar informações gerais, visibilidade e pontuação mesmo após a criação.
              </p>
            </div>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {updateMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome do torneio</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <Label>Tipo de acesso</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.visibility}
                onChange={(e) => set('visibility', e.target.value)}
              >
                {Object.entries(TOURNAMENT_VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <Label>Local (quadra/clube)</Label>
              <Input value={form.venue} onChange={(e) => set('venue', e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.state} onChange={(e) => set('state', e.target.value)} maxLength={2} />
            </div>
            <div>
              <Label>Conjunto de regras</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.ruleset}
                onChange={(e) => set('ruleset', e.target.value)}
              >
                {Object.values(RULESET).map((ruleset) => (
                  <option key={ruleset} value={ruleset}>{RULESET_LABELS[ruleset]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Pontos por game</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.target_score}
                onChange={(e) => set('target_score', e.target.value)}
              >
                {Object.values(TARGET_SCORE).map((score) => (
                  <option key={score} value={score}>{score} pontos</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Sets por partida</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.sets_per_match}
                onChange={(e) => set('sets_per_match', e.target.value)}
              >
                <option value="1">1 set</option>
                <option value="3">Melhor de 3</option>
                <option value="5">Melhor de 5</option>
              </select>
            </div>
            <div>
              <Label>Início</Label>
              <Input type="date" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
            </div>
            <div>
              <Label>Fim das inscrições</Label>
              <Input
                type="date"
                value={form.registration_deadline}
                onChange={(e) => set('registration_deadline', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">Status do torneio</h4>
            <p className="text-sm text-slate-600">
              Atual: <Badge variant="secondary">{TOURNAMENT_STATUS_LABELS[tournament.status]}</Badge>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus(TOURNAMENT_STATUS.REGISTRATIONS_OPEN)}>
                <Play className="w-4 h-4 mr-1" /> Abrir inscrições
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(TOURNAMENT_STATUS.REGISTRATIONS_CLOSED)}>
                <Lock className="w-4 h-4 mr-1" /> Encerrar inscrições
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(TOURNAMENT_STATUS.IN_PROGRESS)}>
                Iniciar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(TOURNAMENT_STATUS.FINISHED)}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Encerrar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold">Admins do torneio</h4>
            <p className="text-xs text-slate-500">
              O criador é admin permanente. Outros admins compartilham todas as funções de gestão deste torneio
              (não afeta o admin geral da plataforma).
            </p>
            <ul className="text-sm space-y-1">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between">
                  <span>
                    {a.user_name || a.user_email}{' '}
                    <Badge variant="secondary" className="ml-1">
                      {a.role === TOURNAMENT_ADMIN_ROLE.OWNER ? 'Owner' : 'Admin'}
                    </Badge>
                  </span>
                  {a.role !== TOURNAMENT_ADMIN_ROLE.OWNER && (
                    <Button size="icon" variant="ghost" onClick={() => removeMutation.mutate(a.user_id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <Label>Adicionar admin (e-mail do usuário já cadastrado)</Label>
              <div className="flex gap-2">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" type="email" />
                <Button onClick={handleAddAdmin} disabled={addMutation.isPending}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
