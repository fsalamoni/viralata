import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check, Copy, RefreshCw, Edit2, Trash2, Mail, Phone, MessageCircle, Lock, Info, Users,
  ShieldCheck, FileText, Clock, X, MapPin, ExternalLink, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useClipboard } from '@/core/lib/useClipboard';
import { cn } from '@/core/lib/utils';
import {
  useRegenerateInviteCode, useClubMembers, useSetMemberPermissions, useRemoveMember,
  useClubInvites, useCancelClubInvite,
} from '@/modules/organizations/hooks/useClubs';
import { ClubJoinRequests } from './ClubJoinRequests';
import { ClubAddMembers } from './ClubAddMembers';
import ClubMemberEditorDialog from './ClubMemberEditorDialog';
import {
  CLUB_ROLE, CLUB_PERMISSION_LABELS, MEMBER_INVITE_STATUS,
} from '@/modules/organizations/domain/constants';
import {
  isClubOwner, effectiveClubPermissions, canEditMember, canManageClubTeam,
} from '@/modules/organizations/domain/permissions';
import {
  CLUB_PERMISSION_BLOCKS, CLUB_PERMISSION_DESCRIPTIONS, accessLevelSummary,
} from '@/modules/organizations/domain/permissionBlocks';
import { shelterDocumentsForMember } from '@/modules/organizations/domain/memberDocuments';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

/**
 * Aba "Equipe" v2 (flag SHELTER_TEAM_V2). Superset retrocompatível da aba V1:
 *  - Cabeçalho conceitual: membro = pessoa PERMANENTE do abrigo, com ao menos
 *    uma atribuição; pode ou não ter poderes de administração.
 *  - Crescimento: código de convite, pedidos de ingresso acionáveis
 *    (ClubJoinRequests), convite por notificação (ClubAddMembers, Fase 0) e a
 *    NOVA lista de convites pendentes com status e opção de cancelar.
 *  - Blocos de permissão por ESCOPO (explícitos, deny-by-default).
 *  - Tabela rica de membros: nível/escopo, telefone/WhatsApp, e-mail, endereço
 *    e vínculo com os documentos/termos da plataforma.
 *
 * Não altera a semântica de permissões nem de convite — apenas organiza e
 * enriquece a apresentação. Só é renderizada quando a flag está ligada; com a
 * flag desligada, o painel usa a aba V1 intacta.
 */
export default function ClubTeamTabV2({ club, viewerMembership, viewerUid }) {
  const { user } = useAuth();
  const uid = viewerUid || user?.uid;
  const viewerCanManageTeam = canManageClubTeam(club, viewerMembership, uid);

  return (
    <div className="space-y-6">
      <ConceptHeader />

      {viewerCanManageTeam && (
        <>
          <InviteCodeCard club={club} />
          <ClubJoinRequests club={club} />
          <ClubAddMembers club={club} />
          <PendingInvitesCard club={club} />
        </>
      )}

      <PermissionBlocksCard club={club} viewerMembership={viewerMembership} viewerUid={uid} />
      <MembersTableCard
        club={club}
        viewerMembership={viewerMembership}
        viewerUid={uid}
        viewerCanManageTeam={viewerCanManageTeam}
      />
    </div>
  );
}

function initials(name) {
  return String(name || 'A').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
}

/** Cabeçalho que esclarece o conceito de "membro permanente com atribuição". */
function ConceptHeader() {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Equipe do abrigo
          </h3>
          <p className="arena-section-card-description">
            A <strong>equipe</strong> é formada por <strong>membros</strong> — pessoas que compõem o
            abrigo de forma <strong>permanente</strong> (não transitória). Todo membro tem ao menos
            algum <strong>nível de atribuição</strong> na plataforma e pode, ou não, participar da
            tomada de decisão (ter poderes de administração).
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <ShieldCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Permanente.</strong> Faz parte do manejo contínuo do abrigo.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <UserCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Com atribuição.</strong> Recebe ao menos um escopo de acesso.</span>
          </li>
          <li className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
            <Lock className="mt-[2px] h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Admin é opcional.</strong> Nem todo membro decide; nem todo membro administra.</span>
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Voluntários e lares temporários são vínculos <em>transitórios</em> — geridos em suas próprias abas.
        </p>
      </div>
    </section>
  );
}

/** Código de convite (idêntico ao V1). */
function InviteCodeCard({ club }) {
  const { copy, copied } = useClipboard();
  const regenerate = useRegenerateInviteCode(club.id);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const handleRegenerate = async () => {
    try {
      const code = await regenerate.mutateAsync();
      toast.success(`Novo código gerado: ${code}`);
      setConfirmRegen(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar novo código.');
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title">Código de convite</h3>
          <p className="arena-section-card-description">Compartilhe este código para que novos membros ingressem na organização.</p>
        </div>
      </div>
      <div className="arena-section-card-body space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-primary/10 bg-secondary/40 px-4 py-2 text-lg font-bold tracking-[0.25em] text-foreground">
            {club.invite_code}
          </code>
          <Button variant="outline" size="sm" onClick={() => copy(club.invite_code, 'Código copiado!')}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />} Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmRegen(true)} disabled={regenerate.isPending}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Gerar novo
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Gerar novo código"
        description="O código atual deixará de funcionar. Deseja continuar?"
        confirmLabel="Gerar novo"
        loading={regenerate.isPending}
        onConfirm={handleRegenerate}
      />
    </section>
  );
}

/**
 * Lista de convites pendentes (aguardando o convidado aceitar/recusar na
 * própria notificação — Fase 0). Um admin pode cancelar um convite pendente.
 */
function PendingInvitesCard({ club }) {
  const { data: invites = [], isLoading } = useClubInvites(club.id);
  const cancelInvite = useCancelClubInvite(club.id);
  const [confirmCancel, setConfirmCancel] = useState(null);

  if (isLoading) return null;
  if (invites.length === 0) return null;

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" /> Convites pendentes
          </h3>
          <p className="arena-section-card-description">
            Convidados que ainda não responderam. A pessoa aceita ou recusa direto na notificação.
          </p>
        </div>
      </div>
      <div className="arena-section-card-body space-y-2 p-6 pt-0 sm:p-7 sm:pt-0">
        <ul className="space-y-2">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {inv.photo_url ? (
                <img src={inv.photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(inv.user_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inv.user_name || 'Convidado'}</p>
                {inv.user_email && <p className="truncate text-xs text-muted-foreground">{inv.user_email}</p>}
              </div>
              <Badge variant="outline" className="shrink-0 rounded-full text-amber-700">
                <Clock className="mr-1 h-3 w-3" /> Aguardando resposta
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-destructive"
                onClick={() => setConfirmCancel(inv)}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancelar
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(v) => !v && setConfirmCancel(null)}
        title="Cancelar convite"
        description={`Cancelar o convite para "${confirmCancel?.user_name}"? A notificação deixará de permitir o aceite.`}
        confirmLabel="Cancelar convite"
        destructive
        loading={cancelInvite.isPending}
        onConfirm={async () => {
          try {
            await cancelInvite.mutateAsync(confirmCancel);
            toast.success('Convite cancelado.');
            setConfirmCancel(null);
          } catch (err) {
            toast.error(err?.message || 'Não foi possível cancelar.');
          }
        }}
      />
    </section>
  );
}

/** Ordena: owner → admins → membros; desempate por nome. */
function useSortedMembers(club) {
  const { data: members = [], isLoading } = useClubMembers(club.id);
  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      const ao = isClubOwner(club, a, undefined);
      const bo = isClubOwner(club, b, undefined);
      if (ao !== bo) return ao ? -1 : 1;
      const aAdmin = a.role === CLUB_ROLE.ADMIN ? 0 : 1;
      const bAdmin = b.role === CLUB_ROLE.ADMIN ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;
      return String(a.user_name || '').localeCompare(String(b.user_name || ''));
    });
  }, [members, club]);
  return { sorted, isLoading };
}

/**
 * Blocos de permissão por ESCOPO. Reaproveita a persistência do V1
 * (useSetMemberPermissions + effectiveClubPermissions) — apenas reorganiza os
 * toggles em blocos rotulados e descritos (deny-by-default).
 */
function PermissionBlocksCard({ club, viewerMembership, viewerUid }) {
  const { sorted, isLoading } = useSortedMembers(club);

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Blocos de permissão por escopo
          </h3>
          <p className="arena-section-card-description">
            As atribuições são agrupadas por área. Nada é concedido por padrão (deny-by-default);
            marque cada poder por membro. O proprietário tem sempre acesso total (não editável).
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-5 sm:p-6">
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {CLUB_PERMISSION_BLOCKS.map((block) => (
            <li key={block.key} className="flex items-start gap-1.5 rounded-lg border border-border bg-card p-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="font-semibold text-foreground">{block.label}.</strong>{' '}
                {block.description}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="arena-section-card-body space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum membro na equipe" description="Adicione membros para começar a colaborar." className="py-4" />
        ) : (
          sorted.map((member) => (
            <MemberPermissionBlocksRow
              key={member.id}
              club={club}
              member={member}
              viewerMembership={viewerMembership}
              viewerUid={viewerUid}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MemberPermissionBlocksRow({ club, member, viewerMembership, viewerUid }) {
  const setPermissions = useSetMemberPermissions(club.id);
  const owner = isClubOwner(club, member, undefined);
  const isAdmin = member.role === CLUB_ROLE.ADMIN;
  const perms = effectiveClubPermissions(club, member, undefined);
  const canEditThis = canEditMember(club, member, viewerMembership, viewerUid);

  const toggle = async (key) => {
    if (!canEditThis || owner) return;
    try {
      await setPermissions.mutateAsync({ member, permissions: { ...perms, [key]: !perms[key] } });
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a permissão.');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        {member.photo_url ? (
          <img src={member.photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-primary/10 object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials(member.user_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{member.user_name}</div>
          {member.user_email && <div className="truncate text-xs text-muted-foreground">{member.user_email}</div>}
        </div>
        <Badge variant={owner ? 'warning' : isAdmin ? 'default' : 'outline'} className="shrink-0 rounded-full">
          {owner ? 'Proprietário' : isAdmin ? 'Administrador' : 'Membro'}
        </Badge>
      </div>

      <div className="space-y-3">
        {CLUB_PERMISSION_BLOCKS.map((block) => (
          <div key={block.key}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{block.label}</p>
            <div className="flex flex-wrap gap-2">
              {block.permissions.map((key) => {
                const checked = !!perms[key];
                const disabled = owner || !canEditThis || setPermissions.isPending;
                return (
                  <label
                    key={key}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors select-none',
                      checked ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
                      disabled && 'cursor-not-allowed opacity-70',
                    )}
                    title={CLUB_PERMISSION_DESCRIPTIONS[key]}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={() => toggle(key)} />
                    <span className={cn('flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background')}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    {CLUB_PERMISSION_LABELS[key]}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {owner && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" /> O proprietário sempre tem todas as permissões.
        </p>
      )}
      {!owner && !canEditThis && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Você não tem permissão para alterar as atribuições deste membro.
        </p>
      )}
    </div>
  );
}

/** Rotas legais efetivamente registradas (evita links quebrados). */
const KNOWN_LEGAL_ROUTES = new Set(['/termos', '/politica-privacidade']);

/** Célula de documentos/termos aplicáveis ao membro (link quando a rota existe). */
function MemberDocsCell({ member, club }) {
  const owner = isClubOwner(club, member, undefined);
  const isAdmin = member.role === CLUB_ROLE.ADMIN;
  const docs = shelterDocumentsForMember({ owner, isAdmin });
  if (docs.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {docs.map((d) => {
        const linkable = KNOWN_LEGAL_ROUTES.has(d.path);
        const content = (
          <>
            <FileText className="h-3 w-3" /> {d.short || d.label}
            {linkable && <ExternalLink className="h-2.5 w-2.5 opacity-70" />}
          </>
        );
        const cls = 'inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground';
        return linkable ? (
          <Link key={d.type} to={d.path} target="_blank" className={cn(cls, 'hover:border-primary/40 hover:text-primary')} title={`${d.label} (v${d.version})`}>
            {content}
          </Link>
        ) : (
          <span key={d.type} className={cls} title={`${d.label} (v${d.version}) — documento da plataforma`}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

/** Tabela rica de membros (nível/escopo, contato, endereço, documentos). */
function MembersTableCard({ club, viewerMembership, viewerUid, viewerCanManageTeam }) {
  const { sorted, isLoading } = useSortedMembers(club);
  const removeMember = useRemoveMember(club.id);
  const [editing, setEditing] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div>
          <h3 className="arena-section-card-title">Membros da equipe</h3>
          <p className="arena-section-card-description">
            Todos os membros permanentes, com nível de acesso, contato, endereço e os documentos/termos
            vinculados. Edite informações e visibilidade pelo botão de edição.
          </p>
        </div>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum membro" description="Convide membros para participar desta organização." className="py-4" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-semibold">Membro</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Nível / escopo</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Contato</th>
                  {viewerCanManageTeam && <th scope="col" className="px-2 py-2 font-semibold">Endereço</th>}
                  <th scope="col" className="px-2 py-2 font-semibold">Documentos</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => {
                  const owner = isClubOwner(club, m);
                  const isAdmin = m.role === CLUB_ROLE.ADMIN;
                  const level = accessLevelSummary({ owner, isAdmin, permissions: effectiveClubPermissions(club, m, undefined) });
                  const canEdit = canEditMember(club, m, viewerMembership, viewerUid);
                  const canRemove = canEdit && !owner && m.user_id !== viewerUid;
                  const whatsappClean = String(m.whatsapp || '').replace(/\D/g, '');
                  const phoneClean = String(m.phone || '').replace(/\D/g, '');
                  return (
                    <tr key={m.id} className="border-b border-border/60 align-top">
                      <td className="px-2 py-3">
                        <div className="flex items-start gap-2">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                              {initials(m.user_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{m.user_name || '—'}</p>
                            {m.user_email && <p className="truncate text-xs text-muted-foreground">{m.user_email}</p>}
                            {m.title && <p className="truncate text-[11px] text-muted-foreground">{m.title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={level.tone === 'owner' ? 'warning' : level.tone === 'admin' ? 'default' : 'outline'} className="rounded-full">
                          {owner ? 'Proprietário' : isAdmin ? 'Administrador' : 'Membro'}
                        </Badge>
                        <p className="mt-1 text-[11px] text-muted-foreground">{level.label}</p>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          {m.phone ? (
                            <a href={`tel:${phoneClean}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                              <Phone className="h-3 w-3" /> {m.phone}
                            </a>
                          ) : null}
                          {m.whatsapp ? (
                            <a href={`https://wa.me/55${whatsappClean}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600">
                              <MessageCircle className="h-3 w-3" /> {m.whatsapp}
                            </a>
                          ) : null}
                          {m.user_email ? (
                            <a href={`mailto:${m.user_email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                              <Mail className="h-3 w-3" /> E-mail
                            </a>
                          ) : null}
                          {!m.phone && !m.whatsapp && !m.user_email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      {viewerCanManageTeam && (
                        <td className="px-2 py-3">
                          {m.address ? (
                            <span className="inline-flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin className="mt-[2px] h-3 w-3 shrink-0" /> <span className="line-clamp-2">{m.address}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3"><MemberDocsCell member={m} club={club} /></td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                              <Edit2 className="mr-1 h-3.5 w-3.5" /> Editar
                            </Button>
                          )}
                          {canRemove && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmRemove(m)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                            </Button>
                          )}
                          {!canEdit && !canRemove && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editing && (
          <ClubMemberEditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            member={{ ...editing, club_id: club.id }}
            canEditProfile
            showAddress
          />
        )}

        <ConfirmDialog
          open={!!confirmRemove}
          onOpenChange={(v) => !v && setConfirmRemove(null)}
          title="Remover membro"
          description={`Tem certeza que deseja remover "${confirmRemove?.user_name}" da equipe?`}
          confirmLabel="Remover"
          destructive
          loading={removeMember.isPending}
          onConfirm={async () => {
            try {
              await removeMember.mutateAsync(confirmRemove);
              toast.success('Membro removido.');
              setConfirmRemove(null);
            } catch (err) {
              toast.error(err?.message || 'Não foi possível remover.');
            }
          }}
        />
      </div>
    </section>
  );
}
