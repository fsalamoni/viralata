/**
 * @fileoverview Componente: FostersListV2 (Fase 3 — SHELTER_FOSTER_V2).
 *
 * Superset retrocompatível de `FostersList` (V1). Só é renderizado quando a flag
 * `SHELTER_FOSTER_V2` está ligada (o painel V3 faz o swap; com a flag OFF, a
 * lista de placements V1 é renderizada intacta).
 *
 * Aprimoramentos (aditivos, sem alterar segurança/escrita dos placements):
 *  - Cabeçalho conceitual: lar temporário = ESPÉCIE de voluntário (membro
 *    TRANSITÓRIO) que fica em uma LISTA PRÓPRIA à disposição para acolher pets;
 *    pode ser PROMOVIDO a membro permanente.
 *  - Cartão de referência de permissões: atribuições só são concedidas quando o
 *    lar é promovido a membro (reusa o bloco "Voluntários" da Fase 1).
 *  - Tabela rica de LARES (agrega placements por lar): "disponível hoje",
 *    período de disponibilidade, capacidade, tipos de pet aceitos, contato
 *    (telefone/WhatsApp/e-mail), endereço (admin-only), placements ativos/
 *    pendentes, documentos/termos vinculados.
 *  - Ação "Promover a membro" (convite por notificação acionável — Fase 0).
 *  - Edição da disponibilidade declarada do lar (datas, capacidade, tipos).
 *
 * Mantém TODA a gestão de placements do V1 (propor/aceitar/prorrogar/finalizar/
 * cancelar) reaproveitando o próprio `FostersList` abaixo da tabela de lares.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, ShieldCheck, UserCheck, Lock, UserPlus, Phone, MessageCircle, Mail,
  MapPin, FileText, ExternalLink, CalendarCheck, Clock, PawPrint, Check, Plus, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/core/lib/utils';
import {
  FOSTER_PET_TYPES,
  FOSTER_PET_TYPE_LABELS,
} from '@/modules/shelter/domain/operational/foster';
import {
  groupFosterHomes,
  isFosterAvailableToday,
  fosterAvailabilityPeriodSummary,
  fosterPetTypeLabels,
  fosterCapacitySummary,
} from '@/modules/shelter/domain/operational/fosterRosterView';
import {
  fosterDocuments,
  FOSTER_TERM_ROUTE,
} from '@/modules/shelter/domain/operational/fosterDocuments';
import {
  useFosters,
  useUpdateFosterAvailability,
} from '@/modules/shelter/hooks/useFosters';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  useClub, useMyMembership, useClubMembers, useInviteMemberToClub,
} from '@/modules/organizations/hooks/useClubs';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { canManageClubTeam } from '@/modules/organizations/domain/permissions';
import { CLUB_PERMISSION_BLOCKS } from '@/modules/organizations/domain/permissionBlocks';
import FostersList from '@/modules/shelter/components/FostersList';

const ENV_LABELS = {
  house_yard: 'Casa com quintal',
  house_no_yard: 'Casa sem quintal',
  apartment: 'Apartamento',
  rural: 'Rural',
  shelter_facility: 'Instalação tipo abrigo',
};

/** Rotas legais efetivamente registradas (evita links quebrados). */
const KNOWN_LEGAL_ROUTES = new Set(['/termos', '/politica-privacidade', FOSTER_TERM_ROUTE]);

function initials(name) {
  return String(name || 'L').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'L';
}

export function FostersListV2({ shelterClubId, actor, canAbriho = false, isFoster = false }) {
  const isV2Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER_V2);
  const { data: placements = [], isLoading, isError, refetch } = useFosters(shelterClubId);

  const { data: club } = useClub(shelterClubId);
  const { data: membership } = useMyMembership(shelterClubId);
  const { data: members = [] } = useClubMembers(shelterClubId);
  const { user } = useAuth();
  const uid = user?.uid;

  const inviteMember = useInviteMemberToClub(club);
  const updateAvailability = useUpdateFosterAvailability(shelterClubId);
  const { toast } = useToast();

  const canPromote = canManageClubTeam(club, membership, uid);
  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const homes = useMemo(() => groupFosterHomes(placements), [placements]);

  const [editingHome, setEditingHome] = useState(null);

  if (!isV2Enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;

  const handlePromote = async (home) => {
    if (memberIds.has(home.foster_uid)) {
      toast({ title: 'Este lar já é membro da equipe.' });
      return;
    }
    if (!(await confirmDialog({
      title: `Promover "${home.name || 'lar temporário'}" a membro permanente?`,
      description: 'Um convite será enviado por notificação. A pessoa aceita ou recusa no próprio sino. Ao aceitar, torna-se membro e pode receber atribuições.',
    }))) return;
    try {
      await inviteMember.mutateAsync({
        user_id: home.foster_uid,
        user_name: home.name || '',
        user_email: home.email || '',
        photo_url: '',
      });
      toast({ title: 'Convite enviado', description: 'O lar temporário receberá uma notificação para aceitar ou recusar.' });
    } catch (err) {
      toast({ title: 'Não foi possível convidar', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleSaveAvailability = async (input) => {
    if (!editingHome?.latest_placement_id) {
      toast({ title: 'Sem placement para vincular a disponibilidade.', variant: 'destructive' });
      return;
    }
    try {
      await updateAvailability.mutateAsync({
        fosterId: editingHome.latest_placement_id,
        input,
        actor,
      });
      toast({ title: 'Disponibilidade atualizada.' });
      setEditingHome(null);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <ConceptHeader />
      <PermissionReferenceCard />

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <div>
            <h3 className="arena-section-card-title flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Lares à disposição ({homes.length})
            </h3>
            <p className="arena-section-card-description">
              Lista própria dos lares temporários à disposição dos membros com atribuição. Veja quem está
              disponível hoje, o período, a capacidade e os tipos de pet aceitos; gerencie a disponibilidade
              e promova lares a membros permanentes. A gestão dos acolhimentos (placements) segue abaixo.
            </p>
          </div>
        </div>
        <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Carregando lares">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os lares.{' '}
              <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
            </p>
          ) : homes.length === 0 ? (
            <EmptyState
              icon={Home}
              title="Nenhum lar temporário ainda"
              description="Assim que um lar for proposto para acolher um pet (abaixo), ele aparece nesta lista com disponibilidade, capacidade e tipos de pet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-semibold">Lar</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Nível / escopo</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Disponibilidade</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Capacidade</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Tipos de pet</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Contato</th>
                    {canAbriho && <th scope="col" className="px-2 py-2 font-semibold">Endereço</th>}
                    <th scope="col" className="px-2 py-2 font-semibold">Acolhimentos</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Documentos</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {homes.map((home) => {
                    const availableToday = isFosterAvailableToday(home.availability_dates);
                    const period = fosterAvailabilityPeriodSummary(home.availability_dates);
                    const petTypes = fosterPetTypeLabels(home.accepted_pet_types);
                    const capacity = fosterCapacitySummary(home.capacity);
                    const isMember = memberIds.has(home.foster_uid);
                    const phoneClean = String(home.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={home.id} className="border-b border-border/60 align-top">
                        <td className="px-2 py-3">
                          <div className="flex items-start gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                              {initials(home.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{home.name || '—'}</p>
                              {home.environment && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {ENV_LABELS[home.environment] || home.environment}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {isMember ? (
                            <Badge variant="default" className="rounded-full">Membro + lar</Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">Lar temporário</Badge>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {isMember ? 'Tem atribuições como membro.' : 'Sem atribuições (transitório).'}
                          </p>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1">
                            {availableToday ? (
                              <Badge className="w-fit bg-green-100 text-green-900">
                                <CalendarCheck className="mr-1 h-3 w-3" /> Disponível hoje
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="w-fit text-muted-foreground">Indisponível hoje</Badge>
                            )}
                            {period ? (
                              <span className="inline-flex items-start gap-1 text-[11px] text-muted-foreground">
                                <Clock className="mt-[2px] h-3 w-3 shrink-0" /> <span className="line-clamp-2">{period}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">período não informado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {capacity ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <PawPrint className="h-3 w-3" /> {capacity}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">não informado</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {petTypes.length ? (
                            <div className="flex flex-wrap gap-1">
                              {petTypes.map((t) => (
                                <span key={t} className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">não informado</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1 text-xs">
                            {home.phone ? (
                              <a href={`tel:${phoneClean}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                                <Phone className="h-3 w-3" /> {home.phone}
                              </a>
                            ) : null}
                            {phoneClean ? (
                              <a href={`https://wa.me/55${phoneClean}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </a>
                            ) : null}
                            {home.email ? (
                              <a href={`mailto:${home.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                                <Mail className="h-3 w-3" /> E-mail
                              </a>
                            ) : null}
                            {!home.phone && !home.email && <span className="text-muted-foreground">—</span>}
                          </div>
                        </td>
                        {canAbriho && (
                          <td className="px-2 py-3">
                            {home.address ? (
                              <span className="inline-flex items-start gap-1 text-xs text-muted-foreground">
                                <MapPin className="mt-[2px] h-3 w-3 shrink-0" /> <span className="line-clamp-2">{home.address}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {home.active_count > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-900">{home.active_count} ativo(s)</Badge>
                            )}
                            {home.pending_count > 0 && (
                              <Badge className="bg-amber-100 text-amber-900">{home.pending_count} pendente(s)</Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">{home.placements_count} no total</span>
                          </div>
                        </td>
                        <td className="px-2 py-3"><FosterDocsCell home={home} /></td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-end gap-1">
                            {canAbriho && (
                              <Button size="sm" variant="outline" onClick={() => setEditingHome(home)}>
                                Disponibilidade
                              </Button>
                            )}
                            {canPromote && !isMember && (
                              <Button size="sm" variant="outline" onClick={() => handlePromote(home)} disabled={inviteMember.isPending}>
                                <UserPlus className="mr-1 h-3.5 w-3.5" /> Promover a membro
                              </Button>
                            )}
                            {!canAbriho && !canPromote && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Gestão de acolhimentos (placements) — reusa o componente V1 intacto. */}
      <FostersList
        shelterClubId={shelterClubId}
        actor={actor}
        canAbriho={canAbriho}
        isFoster={isFoster}
      />

      {editingHome && (
        <AvailabilityEditorDialog
          home={editingHome}
          pending={updateAvailability.isPending}
          onClose={() => setEditingHome(null)}
          onSave={handleSaveAvailability}
        />
      )}
    </div>
  );
}

/** Cabeçalho que esclarece o conceito de "lar temporário = voluntário em lista própria". */
function ConceptHeader() {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" /> Lares temporários do abrigo
          </h3>
          <p className="arena-section-card-description">
            O lar temporário é uma <strong>espécie de voluntário</strong> que <strong>não é permanente</strong> no
            manejo do abrigo: faz parte da equipe de modo <strong>temporário e transitório</strong>. Fica em uma
            <strong> lista própria</strong> à disposição dos membros com atribuição para acolher pets, indicando as
            <strong> datas de disponibilidade</strong>, a <strong>quantidade</strong> e os <strong>tipos de pet</strong> que
            aceita. Um lar pode se tornar <strong>membro permanente</strong> quando um membro com atribuição o promove.
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Clock className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Transitório.</strong> Vínculo temporário, não permanente.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <CalendarCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">À disposição.</strong> Acolhe pets conforme datas, capacidade e tipos.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <UserPlus className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Promovível.</strong> Pode virar membro permanente com atribuições.</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/**
 * Cartão de referência das atribuições concedíveis. Lares não têm slot de
 * permissão próprio — para conceder atribuições, promova-os a membro (Fase 1).
 */
function PermissionReferenceCard() {
  const volunteersBlock = CLUB_PERMISSION_BLOCKS.find((b) => b.key === 'volunteers');
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Atribuições e níveis de acesso
          </h3>
          <p className="arena-section-card-description">
            Qualquer atribuição pode ser concedida a um lar temporário — a critério dos membros com atribuição.
            Como o lar não tem um nível de acesso próprio, conceder atribuições significa
            <strong> promovê-lo a membro</strong> (deny-by-default; nada é concedido automaticamente).
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <UserCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Gestão de voluntários/lares.</strong>{' '}
              {volunteersBlock?.description || 'Acesso e gestão da lista de voluntários e lares.'}
            </span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Lock className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Promoção a membro.</strong> Envia convite por notificação;
              ao aceitar, o lar passa a receber blocos de permissão como qualquer membro.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Célula de documentos/termos aplicáveis ao lar (link quando a rota existe). */
function FosterDocsCell({ home }) {
  const docs = fosterDocuments({ home });
  if (docs.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {docs.map((d) => {
        const linkable = KNOWN_LEGAL_ROUTES.has(d.path);
        const accepted = d.accepted === true;
        const content = (
          <>
            <FileText className="h-3 w-3" /> {d.short || d.label}
            {accepted && <Check className="h-2.5 w-2.5 text-green-700" />}
            {linkable && <ExternalLink className="h-2.5 w-2.5 opacity-70" />}
          </>
        );
        const cls = cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
          accepted ? 'border-green-200 bg-green-50 text-green-800' : 'border-border bg-background text-muted-foreground',
        );
        const title = `${d.label} (v${d.version})${accepted ? ` — aceito${d.accepted_at ? ` em ${new Date(d.accepted_at).toLocaleDateString('pt-BR')}` : ''}` : ''}`;
        return linkable ? (
          <Link key={d.type} to={d.path} target="_blank" className={cn(cls, 'hover:border-primary/40 hover:text-primary')} title={title}>
            {content}
          </Link>
        ) : (
          <span key={d.type} className={cls} title={title}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Diálogo para editar a disponibilidade declarada do lar: janelas de datas,
 * capacidade (quantidade de pets) e tipos de pet aceitos.
 */
function AvailabilityEditorDialog({ home, pending, onClose, onSave }) {
  const [windows, setWindows] = useState(() =>
    Array.isArray(home?.availability_dates) && home.availability_dates.length
      ? home.availability_dates.map((w) => ({ start_date: w.start_date || '', end_date: w.end_date || '' }))
      : [{ start_date: '', end_date: '' }],
  );
  const [capacity, setCapacity] = useState(
    Number.isFinite(home?.capacity) ? String(home.capacity) : '',
  );
  const [petTypes, setPetTypes] = useState(() => new Set(home?.accepted_pet_types || []));
  const [error, setError] = useState('');

  const togglePetType = (t) => {
    setPetTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const setWindow = (i, key, value) => {
    setWindows((prev) => prev.map((w, idx) => (idx === i ? { ...w, [key]: value } : w)));
  };
  const addWindow = () => setWindows((prev) => [...prev, { start_date: '', end_date: '' }]);
  const removeWindow = (i) => setWindows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    setError('');
    // Filtra janelas completas; valida fim >= início.
    const cleanWindows = [];
    for (const w of windows) {
      if (!w.start_date && !w.end_date) continue; // linha vazia → ignora
      if (!w.start_date || !w.end_date) {
        setError('Preencha início e fim de cada janela (ou remova a linha).');
        return;
      }
      if (w.end_date < w.start_date) {
        setError('Em cada janela, a data final deve ser igual ou posterior à inicial.');
        return;
      }
      cleanWindows.push({ start_date: w.start_date, end_date: w.end_date });
    }

    const input = {
      availability_dates: cleanWindows,
      accepted_pet_types: Array.from(petTypes),
    };
    if (capacity !== '') {
      const n = Number(capacity);
      if (!Number.isInteger(n) || n < 0 || n > 50) {
        setError('Capacidade deve ser um número inteiro entre 0 e 50.');
        return;
      }
      input.capacity = n;
    }
    onSave(input);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disponibilidade do lar temporário</DialogTitle>
          <DialogDescription>
            {home?.name ? `${home.name} · ` : ''}
            Datas em que o lar fica à disposição para acolher pets, quantidade e tipos de pet aceitos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Janelas de disponibilidade</Label>
            {windows.map((w, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <Label htmlFor={`start-${i}`} className="text-[11px] text-muted-foreground">Início</Label>
                  <Input
                    id={`start-${i}`}
                    type="date"
                    value={w.start_date}
                    onChange={(e) => setWindow(i, 'start_date', e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label htmlFor={`end-${i}`} className="text-[11px] text-muted-foreground">Fim</Label>
                  <Input
                    id={`end-${i}`}
                    type="date"
                    value={w.end_date}
                    onChange={(e) => setWindow(i, 'end_date', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-red-700"
                  title="Remover janela"
                  onClick={() => removeWindow(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addWindow}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar janela
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foster-capacity">Capacidade (quantidade de pets)</Label>
            <Input
              id="foster-capacity"
              type="number"
              min={0}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex.: 2"
              className="max-w-[140px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipos de pet aceitos</Label>
            <div className="flex flex-wrap gap-2">
              {FOSTER_PET_TYPES.map((t) => {
                const active = petTypes.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => togglePetType(t)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {active && <Check className="h-3 w-3" />} {FOSTER_PET_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={pending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FostersListV2;
