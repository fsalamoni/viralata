import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, RefreshCw, Edit2, Trash2, Mail, Phone, MessageCircle, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClipboard } from '@/core/lib/useClipboard';
import { cn } from '@/core/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useRegenerateInviteCode, useClubMembers, useSetMemberPermissions, useRemoveMember,
} from '@/modules/organizations/hooks/useClubs';
import { ClubJoinRequests } from './ClubJoinRequests';
import { ClubAddMembers } from './ClubAddMembers';
import ClubMemberEditorDialog from './ClubMemberEditorDialog';
import {
  CLUB_ROLE,
  CLUB_PERMISSION,
  CLUB_PERMISSION_KEYS,
  CLUB_PERMISSION_LABELS,
} from '@/modules/organizations/domain/constants';
import {
  isClubOwner, effectiveClubPermissions, canEditMember, canManageClubTeam,
} from '@/modules/organizations/domain/permissions';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

/**
 * Descrições curtas de cada permissão, exibidas na seção de permissões
 * da equipe. Mantém o painel autoexplicativo para quem administra pela
 * primeira vez.
 */
const PERMISSION_DESCRIPTIONS = {
  [CLUB_PERMISSION.ANIMALS]: 'Importar, editar e remover pets da planilha.',
  [CLUB_PERMISSION.FINANCE]: 'Criar e remover lançamentos, gerenciar categorias.',
  [CLUB_PERMISSION.DONATIONS]: 'Criar, editar e excluir chamados de doação. Registrar valor arrecadado e analisar comprovantes.',
  [CLUB_PERMISSION.FEED]: 'Publicar, editar e remover posts do mural da ONG.',
  [CLUB_PERMISSION.TEAM]: 'Admitir e remover membros, promover a admin, e atribuir permissões.',
};

/**
 * Aba "Equipe" do painel de administração: crescimento (código de convite,
 * pedidos de ingresso, convite de novos membros) + grade de permissões
 * por membro + grade de cards de membros com privacidade e edição inline.
 *
 * As permissões granulares (animals, finance, donations, feed, team)
 * ficam visíveis para cada membro. O owner é sempre travado em todas;
 * quem pode editar essas permissões é resolvido por `canManageClubTeam`.
 */
export default function ClubTeamTab({ club, viewerMembership, viewerUid }) {
  const { copy, copied } = useClipboard();
  const { user } = useAuth();
  const regenerate = useRegenerateInviteCode(club.id);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const viewerCanManageTeam = canManageClubTeam(club, viewerMembership, viewerUid || user?.uid);
  const owner = isClubOwner(club, viewerMembership, viewerUid || user?.uid);

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
    <div className="space-y-6">
      {viewerCanManageTeam && (
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
        </section>
      )}

      {viewerCanManageTeam && (
        <>
          <ClubJoinRequests club={club} />
          <ClubAddMembers club={club} />
        </>
      )}

      <ClubPermissionsCard club={club} viewerMembership={viewerMembership} viewerUid={viewerUid || user?.uid} />
      <ClubMembersCardsSection club={club} viewerMembership={viewerMembership} viewerUid={viewerUid || user?.uid} />

      {viewerCanManageTeam && (
        <ConfirmDialog
          open={confirmRegen}
          onOpenChange={setConfirmRegen}
          title="Gerar novo código"
          description="O código atual deixará de funcionar. Deseja continuar?"
          confirmLabel="Gerar novo"
          loading={regenerate.isPending}
          onConfirm={handleRegenerate}
        />
      )}
    </div>
  );
}

function initials(name) {
  return String(name || 'A').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
}

/**
 * Grade de permissões por membro (admin ou comum). Cada membro da equipe
 * tem 5 toggles para as permissões granulares. O proprietário sempre
 * trava todas as permissões (não pode ser editado).
 *
 * Quem pode editar é resolvido por `canManageClubTeam` + `canEditMember`:
 * apenas o owner ou alguém com permissão `team` consegue alterar.
 */
function ClubPermissionsCard({ club, viewerMembership, viewerUid }) {
  const { data: members = [], isLoading } = useClubMembers(club.id);
  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      // Owner primeiro; depois admins; depois membros comuns. Desempate
      // por nome para deixar a lista estável.
      const ao = isClubOwner(club, a, undefined);
      const bo = isClubOwner(club, b, undefined);
      if (ao !== bo) return ao ? -1 : 1;
      const aAdmin = a.role === CLUB_ROLE.ADMIN ? 0 : 1;
      const bAdmin = b.role === CLUB_ROLE.ADMIN ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;
      return String(a.user_name || '').localeCompare(String(b.user_name || ''));
    });
  }, [members, club]);

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header"> className="p-6 sm:p-7">
        <h3 className="arena-section-card-title">Permissões da equipe</h3>
        <div className="arena-section-card-description flex items-start gap-2">
          <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" />
          <span>
            Marque ou desmarque para atribuir cada poder a um membro.
            O proprietário sempre tem todas as permissões (não editável).
          </span>
        </div>
        {/* Legenda curta das 5 permissões */}
        <ul className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {CLUB_PERMISSION_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="font-semibold text-foreground">{CLUB_PERMISSION_LABELS[key]}.</strong>{' '}
                {PERMISSION_DESCRIPTIONS[key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="arena-section-card-body space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro na equipe ainda.</p>
        ) : (
          sorted.map((member) => (
            <MemberPermissionsRow
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

function MemberPermissionsRow({ club, member, viewerMembership, viewerUid }) {
  const setPermissions = useSetMemberPermissions(club.id);
  const owner = isClubOwner(club, member, undefined);
  const isAdmin = member.role === CLUB_ROLE.ADMIN;
  const perms = effectiveClubPermissions(club, member, undefined);
  // Apenas o owner ou alguém com permissão `team` pode editar; também
  // bloqueamos a alteração do próprio owner (imutável).
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
      <div className="flex flex-wrap gap-2">
        {CLUB_PERMISSION_KEYS.map((key) => {
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
              title={PERMISSION_DESCRIPTIONS[key]}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(key)}
              />
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border',
                  checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
                )}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>
              {CLUB_PERMISSION_LABELS[key]}
            </label>
          );
        })}
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

/** Grade de cards dos membros da equipe com edição, privacidade e remoção. */
function ClubMembersCardsSection({ club, viewerMembership, viewerUid }) {
  const { data: members = [], isLoading } = useClubMembers(club.id);
  const removeMember = useRemoveMember(club.id);
  const [editing, setEditing] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
          <div>
            <h3 className="arena-section-card-title">Membros da equipe</h3>
            <p className="arena-section-card-description">Cada membro tem um card com privacidade por campo. Edite as informações e a visibilidade pelo botão de edição.</p>
          </div>
        </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((m) => {
              const owner = isClubOwner(club, m);
              const canEdit = canEditMember(club, m, viewerMembership, viewerUid);
              const canRemove = canEdit && !owner && m.user_id !== viewerUid;
              const whatsappClean = String(m.whatsapp || '').replace(/\D/g, '');
              const phoneClean = String(m.phone || '').replace(/\D/g, '');
              return (
                <li key={m.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {initials(m.user_name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.user_name || '—'}</p>
                      {m.title && <p className="truncate text-xs text-muted-foreground">{m.title}</p>}
                    </div>
                    <Badge variant={owner ? 'warning' : m.role === CLUB_ROLE.ADMIN ? 'default' : 'outline'} className="rounded-full">
                      {owner ? 'Proprietário' : (m.role === CLUB_ROLE.ADMIN ? 'Administrador' : 'Membro')}
                    </Badge>
                  </div>
                  {m.bio && <p className="mt-2 line-clamp-2 text-xs text-foreground/85">{m.bio}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {m.user_email && (
                      <Button asChild size="icon" variant="outline" className="h-7 w-7" title={`E-mail: ${m.user_email}`}>
                        <a href={`mailto:${m.user_email}`}><Mail className="h-3 w-3" /></a>
                      </Button>
                    )}
                    {m.whatsapp && (
                      <Button asChild size="icon" variant="outline" className="h-7 w-7" title={`WhatsApp: ${m.whatsapp}`}>
                        <a href={`https://wa.me/55${whatsappClean}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                        </a>
                      </Button>
                    )}
                    {m.phone && (
                      <Button asChild size="icon" variant="outline" className="h-7 w-7" title={`Telefone: ${m.phone}`}>
                        <a href={`tel:${phoneClean}`}><Phone className="h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                        <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                    )}
                    {canRemove && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmRemove(m)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {editing && (
          <ClubMemberEditorDialog
            open
            onOpenChange={(v) => !v && setEditing(null)}
            member={{ ...editing, club_id: club.id }}
            canEditProfile
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
