/**
 * @fileoverview Componente: VolunteersRosterV2 (Fase 2 — SHELTER_VOLUNTEERS_V2).
 *
 * Superset retrocompatível de `VolunteersRoster` (V1). Só é renderizado quando a
 * flag `SHELTER_VOLUNTEERS_V2` está ligada (o wrapper `VolunteersAdminTab` faz o
 * swap; com a flag OFF, o painel usa o roster V1 intacto).
 *
 * Aprimoramentos (aditivos, sem alterar segurança/escrita):
 *  - Cabeçalho conceitual: voluntário = "membro" TRANSITÓRIO (faz parte da
 *    equipe de forma temporária); pode ser PROMOVIDO a membro permanente; fica à
 *    disposição para receber atividades/tarefas.
 *  - Cartão de referência de permissões: atribuições só são concedidas quando o
 *    voluntário é promovido a membro (reusa o bloco "Voluntários" da Fase 1).
 *  - Tabela rica: atividades a que se dispõe, "disponível hoje", período de
 *    disponibilidade, contato (telefone/WhatsApp/e-mail), endereço (admin-only),
 *    status + background check, documentos/termos vinculados.
 *  - Ação "Promover a membro" (convite por notificação acionável — Fase 0).
 *  - Edição do endereço administrado pelo abrigo.
 *
 * Mantém TODAS as ações do V1 (aprovar/rejeitar BG, pausar/retomar, bloquear,
 * marcar saída, excluir) com os mesmos gates de permissão.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, UserCheck, Lock, UserPlus, Phone, MessageCircle, Mail,
  MapPin, FileText, ExternalLink, CalendarCheck, Edit2, Check, Clock,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDialog } from '@/components/ui/confirm-provider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/core/lib/utils';
import {
  VOLUNTEER_SHELTER_STATUS,
  canVolunteerParticipate,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import {
  isVolunteerAvailableToday,
  availabilityPeriodSummary,
  volunteerActivityLabels,
} from '@/modules/shelter/domain/operational/volunteerRosterView';
import {
  volunteerDocuments,
  VOLUNTEER_TERM_ROUTE,
} from '@/modules/shelter/domain/operational/volunteerDocuments';
import {
  useShelterVolunteers,
  useDeleteShelterVolunteer,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import {
  updateShelterVolunteer,
} from '@/modules/shelter/services/volunteerProfileService';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  useClub, useMyMembership, useClubMembers, useInviteMemberToClub,
} from '@/modules/organizations/hooks/useClubs';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  canManageVolunteers,
  canManageVolunteerStatus,
  canManageVolunteerBG,
  canDeleteVolunteer,
  canManageClubTeam,
} from '@/modules/organizations/domain/permissions';
import { CLUB_PERMISSION_BLOCKS } from '@/modules/organizations/domain/permissionBlocks';

const SHELTER_STATUS_LABELS = {
  active: 'Ativo', paused: 'Pausado', blocked: 'Bloqueado', left: 'Saiu',
};
const SHELTER_STATUS_TONES = {
  active: 'bg-green-100 text-green-900',
  paused: 'bg-amber-100 text-amber-900',
  blocked: 'bg-red-100 text-red-900',
  left: 'bg-zinc-100 text-zinc-700',
};
const BG_CHECK_LABELS = {
  not_required: 'Não exigido', pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado',
};
const BG_CHECK_TONES = {
  not_required: 'bg-zinc-100 text-zinc-700',
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
};

/** Rotas legais efetivamente registradas (evita links quebrados). */
const KNOWN_LEGAL_ROUTES = new Set(['/termos', '/politica-privacidade', VOLUNTEER_TERM_ROUTE]);

function initials(name) {
  return String(name || 'V').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'V';
}

export function VolunteersRosterV2({ shelterClubId, actor, canAbriho }) {
  const isV2Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS_V2);
  const [statusFilter, setStatusFilter] = useState(null);
  const { data: volunteers = [], isLoading, isError, refetch } = useShelterVolunteers(shelterClubId, { status: statusFilter });

  const qc = useQueryClient();
  const deleteMutation = useDeleteShelterVolunteer(shelterClubId);
  const { toast } = useToast();

  const { data: club } = useClub(shelterClubId);
  const { data: membership } = useMyMembership(shelterClubId);
  const { data: members = [] } = useClubMembers(shelterClubId);
  const { user } = useAuth();
  const uid = user?.uid;

  // Convite (promover a membro) — reusa a notificação acionável da Fase 0.
  const inviteMember = useInviteMemberToClub(club);

  // Mutations por-linha corretas (o hook V1 fixa volunteerUid=null; aqui o uid
  // vai em cada chamada, garantindo que a ação atinja o voluntário certo).
  const updateVol = useMutation({
    mutationFn: ({ volunteerUid, input }) => updateShelterVolunteer(shelterClubId, volunteerUid, input, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-volunteers', shelterClubId] }),
  });

  const perm = canAbriho === undefined ? canManageVolunteers(club, membership, uid) : Boolean(canAbriho);
  const canManageStatus = canManageVolunteerStatus(club, membership, uid);
  const canManageBG = canManageVolunteerBG(club, membership, uid);
  const canDeleteVol = canDeleteVolunteer(club, membership, uid);
  const canPromote = canManageClubTeam(club, membership, uid);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const [editingAddress, setEditingAddress] = useState(null);

  if (!isV2Enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando voluntários">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar os voluntários.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
      </p>
    );
  }

  const handleBgCheck = async (volunteerUid, newStatus) => {
    try {
      await updateVol.mutateAsync({ volunteerUid, input: { background_check_status: newStatus } });
      toast({ title: `Background check → ${BG_CHECK_LABELS[newStatus]}` });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (volunteerUid, newStatus) => {
    try {
      await updateVol.mutateAsync({ volunteerUid, input: { status: newStatus } });
      toast({ title: `Status → ${SHELTER_STATUS_LABELS[newStatus]}` });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleRemove = async (volunteerUid) => {
    if (!(await confirmDialog({ title: 'Remover este voluntário da rostagem? (hard delete, use com cuidado)' }))) return;
    try {
      await deleteMutation.mutateAsync({ volunteerUid, actor });
      toast({ title: 'Voluntário removido.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handlePromote = async (v) => {
    if (memberIds.has(v.id)) {
      toast({ title: 'Este voluntário já é membro da equipe.' });
      return;
    }
    if (!(await confirmDialog({
      title: `Promover "${v.volunteer_name}" a membro permanente?`,
      description: 'Um convite será enviado por notificação. A pessoa aceita ou recusa no próprio sino. Ao aceitar, torna-se membro e pode receber atribuições.',
    }))) return;
    try {
      await inviteMember.mutateAsync({
        user_id: v.id,
        user_name: v.volunteer_name,
        user_email: v.volunteer_email || '',
        photo_url: v.volunteer_photo_url || '',
      });
      toast({ title: 'Convite enviado', description: 'O voluntário receberá uma notificação para aceitar ou recusar.' });
    } catch (err) {
      toast({ title: 'Não foi possível convidar', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <ConceptHeader />
      <PermissionReferenceCard />

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <div>
            <h3 className="arena-section-card-title">Voluntários ({volunteers.length})</h3>
            <p className="arena-section-card-description">
              Lista à disposição dos membros com atribuição. Filtre por status, veja atividades e
              disponibilidade, gerencie o vínculo e promova voluntários a membros permanentes.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            <Button size="sm" variant={statusFilter === null ? 'default' : 'outline'} onClick={() => setStatusFilter(null)}>
              Todos
            </Button>
            {VOLUNTEER_SHELTER_STATUS.map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                {SHELTER_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
        <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
          {volunteers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum voluntário ainda"
              description="Compartilhe a página do abrigo ou o link /voluntarios/seja para receber as primeiras inscrições."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-semibold">Voluntário</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Nível / escopo</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Atividades</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Disponibilidade</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Contato</th>
                    {perm && <th scope="col" className="px-2 py-2 font-semibold">Endereço</th>}
                    <th scope="col" className="px-2 py-2 font-semibold">Status / BG</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Documentos</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map((v) => {
                    const activities = volunteerActivityLabels(v.skills);
                    const availableToday = isVolunteerAvailableToday(v.availability);
                    const period = availabilityPeriodSummary(v.availability);
                    const isMember = memberIds.has(v.id);
                    const phoneClean = String(v.volunteer_phone || '').replace(/\D/g, '');
                    return (
                      <tr key={v.id} className="border-b border-border/60 align-top">
                        <td className="px-2 py-3">
                          <div className="flex items-start gap-2">
                            {v.volunteer_photo_url ? (
                              <img src={v.volunteer_photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                {initials(v.volunteer_name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{v.volunteer_name || '—'}</p>
                              {v.volunteer_email && <p className="truncate text-xs text-muted-foreground">{v.volunteer_email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {isMember ? (
                            <Badge variant="default" className="rounded-full">Membro + voluntário</Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">Voluntário</Badge>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {isMember ? 'Tem atribuições como membro.' : 'Sem atribuições (transitório).'}
                          </p>
                        </td>
                        <td className="px-2 py-3">
                          {activities.length ? (
                            <div className="flex flex-wrap gap-1">
                              {activities.map((a) => (
                                <span key={a} className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">não informado</span>
                          )}
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
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" /> {period}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">período não informado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1 text-xs">
                            {v.volunteer_phone ? (
                              <a href={`tel:${phoneClean}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                                <Phone className="h-3 w-3" /> {v.volunteer_phone}
                              </a>
                            ) : null}
                            {phoneClean ? (
                              <a href={`https://wa.me/55${phoneClean}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </a>
                            ) : null}
                            {v.volunteer_email ? (
                              <a href={`mailto:${v.volunteer_email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                                <Mail className="h-3 w-3" /> E-mail
                              </a>
                            ) : null}
                            {!v.volunteer_phone && !v.volunteer_email && <span className="text-muted-foreground">—</span>}
                          </div>
                        </td>
                        {perm && (
                          <td className="px-2 py-3">
                            <div className="flex items-start gap-1">
                              {v.volunteer_address ? (
                                <span className="inline-flex items-start gap-1 text-xs text-muted-foreground">
                                  <MapPin className="mt-[2px] h-3 w-3 shrink-0" /> <span className="line-clamp-2">{v.volunteer_address}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {canManageStatus && v.status !== 'left' && (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-primary"
                                  title="Editar endereço"
                                  onClick={() => setEditingAddress(v)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <Badge className={SHELTER_STATUS_TONES[v.status]}>{SHELTER_STATUS_LABELS[v.status]}</Badge>
                            <Badge className={BG_CHECK_TONES[v.background_check_status]}>BG: {BG_CHECK_LABELS[v.background_check_status]}</Badge>
                            {canVolunteerParticipate(v) ? (
                              <Badge className="bg-blue-100 text-blue-900">Pode participar</Badge>
                            ) : (
                              <Badge className="bg-zinc-100 text-zinc-700">Não pode participar</Badge>
                            )}
                            {v.background_check_notes && (
                              <span className="text-[11px] text-muted-foreground">📝 {v.background_check_notes}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3"><VolunteerDocsCell volunteer={v} /></td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-end gap-1">
                            {perm && v.status !== 'left' && (
                              <>
                                {canManageBG && v.background_check_status === 'pending' && (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => handleBgCheck(v.id, 'approved')}>Aprovar BG</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleBgCheck(v.id, 'rejected')}>Rejeitar BG</Button>
                                  </div>
                                )}
                                <div className="flex flex-wrap justify-end gap-1">
                                  {canManageStatus && v.status === 'active' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'paused')}>Pausar</Button>
                                  )}
                                  {canManageStatus && v.status === 'paused' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'active')}>Retomar</Button>
                                  )}
                                  {canManageStatus && v.status === 'active' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'blocked')}>Bloquear</Button>
                                  )}
                                  {canPromote && !isMember && (
                                    <Button size="sm" variant="outline" onClick={() => handlePromote(v)} disabled={inviteMember.isPending}>
                                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Promover a membro
                                    </Button>
                                  )}
                                  {canManageStatus && (
                                    <Button size="sm" variant="ghost" onClick={() => handleStatusChange(v.id, 'left')}>Marcar saída</Button>
                                  )}
                                  {canDeleteVol && (
                                    <Button size="sm" variant="ghost" className="text-red-700" onClick={() => handleRemove(v.id)}>Excluir</Button>
                                  )}
                                </div>
                              </>
                            )}
                            {(!perm || v.status === 'left') && <span className="text-xs text-muted-foreground">—</span>}
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

      {editingAddress && (
        <AddressEditorDialog
          volunteer={editingAddress}
          pending={updateVol.isPending}
          onClose={() => setEditingAddress(null)}
          onSave={async (address) => {
            try {
              await updateVol.mutateAsync({ volunteerUid: editingAddress.id, input: { volunteer_address: address } });
              toast({ title: 'Endereço atualizado.' });
              setEditingAddress(null);
            } catch (err) {
              toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
            }
          }}
        />
      )}
    </div>
  );
}

/** Cabeçalho que esclarece o conceito de "voluntário = membro transitório". */
function ConceptHeader() {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Voluntários do abrigo
          </h3>
          <p className="arena-section-card-description">
            Voluntários são uma espécie de <strong>membro</strong> que <strong>não é permanente</strong> no
            manejo do abrigo: fazem parte da equipe de modo <strong>temporário e transitório</strong>. Ficam
            à disposição dos membros com atribuição para receber atividades e tarefas, e indicam os tipos de
            atividade a que se dispõem. Um voluntário pode se tornar <strong>membro permanente</strong> quando
            um membro com atribuição o promove.
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
            <span><strong className="text-foreground">À disposição.</strong> Recebe atividades conforme disponibilidade.</span>
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
 * Cartão de referência das atribuições concedíveis. Voluntários não têm slot de
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
            Qualquer atribuição pode ser concedida a um voluntário — a critério dos membros com atribuição.
            Como o voluntário não tem um nível de acesso próprio, conceder atribuições significa
            <strong> promovê-lo a membro</strong> (deny-by-default; nada é concedido automaticamente).
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <UserCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Gestão de voluntários.</strong>{' '}
              {volunteersBlock?.description || 'Acesso e gestão da lista de voluntários.'}
            </span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Lock className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Promoção a membro.</strong> Envia convite por notificação;
              ao aceitar, o voluntário passa a receber blocos de permissão como qualquer membro.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Célula de documentos/termos aplicáveis ao voluntário (link quando a rota existe). */
function VolunteerDocsCell({ volunteer }) {
  const docs = volunteerDocuments({ rosterEntry: volunteer });
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

/** Diálogo mínimo para editar o endereço do voluntário administrado pelo abrigo. */
function AddressEditorDialog({ volunteer, pending, onClose, onSave }) {
  const [value, setValue] = useState(volunteer?.volunteer_address || '');
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Endereço do voluntário</DialogTitle>
          <DialogDescription>
            Endereço administrado pelo abrigo (visível apenas para a gestão). Deixe em branco para remover.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="vol-address">Endereço</Label>
          <Input
            id="vol-address"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Rua, número, bairro, cidade/UF"
            maxLength={240}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={() => onSave(value.trim())} disabled={pending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VolunteersRosterV2;
