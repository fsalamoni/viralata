import React, { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, RefreshCw, Edit2, Trash2, UserPlus, Mail, Phone, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { CLUB_ROLE, CLUB_PERMISSION_KEYS, CLUB_PERMISSION_LABELS } from '@/modules/organizations/domain/constants';
import {
  isClubOwner, effectiveClubPermissions, canEditMember,
} from '@/modules/organizations/domain/permissions';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

/**
 * Aba "Equipe" do painel de administração: crescimento (código de convite,
 * pedidos de ingresso, convite de novos membros) + grade de permissões
 * dos administradores + grade de cards de membros com privacidade e
 * edição inline.
 */
export default function ClubTeamTab({ club }) {
  const { copy, copied } = useClipboard();
  const { user } = useAuth();
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
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-base">Código de convite</CardTitle>
          <CardDescription>Compartilhe este código para que novos membros ingressem na organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
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
        </CardContent>
      </Card>

      <ClubJoinRequests club={club} />
      <ClubAddMembers club={club} />
      <ClubAdminPermissionsCard club={club} />
      <ClubMembersCardsSection club={club} viewerMembership={null} viewerUid={user?.uid} />

      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Gerar novo código"
        description="O código atual deixará de funcionar. Deseja continuar?"
        confirmLabel="Gerar novo"
        loading={regenerate.isPending}
        onConfirm={handleRegenerate}
      />
    </div>
  );
}

function initials(name) {
  return String(name || 'A').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
}

/** Grade de permissões granulares — só admins (owner sempre travado). */
function ClubAdminPermissionsCard({ club }) {
  const { data: members = [], isLoading } = useClubMembers(club.id);
  const admins = members
    .filter((m) => m.role === CLUB_ROLE.ADMIN)
    .sort((a, b) => (isClubOwner(club, a, undefined) ? -1 : isClubOwner(club, b, undefined) ? 1 : 0));

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-base">Permissões dos administradores</CardTitle>
        <CardDescription>
          Escolha exatamente o que cada administrador pode gerenciar no painel. O proprietário sempre tem todas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum administrador ainda.</p>
        ) : (
          admins.map((member) => <AdminPermissionsRow key={member.id} club={club} member={member} />)
        )}
      </CardContent>
    </Card>
  );
}

function AdminPermissionsRow({ club, member }) {
  const setPermissions = useSetMemberPermissions(club.id);
  const owner = isClubOwner(club, member);
  const perms = effectiveClubPermissions(club, member);

  const toggle = async (key) => {
    if (owner) return;
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
        <Badge variant="warning" className="shrink-0 rounded-full">{owner ? 'Proprietário' : 'Administrador'}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {CLUB_PERMISSION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            disabled={owner || setPermissions.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              perms[key] ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
              owner ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-secondary/60',
            )}
          >
            {perms[key] && <Check className="h-3 w-3" />}
            {CLUB_PERMISSION_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Grade de cards dos membros da equipe com edição, privacidade e remoção. */
function ClubMembersCardsSection({ club, viewerUid }) {
  const { data: members = [], isLoading } = useClubMembers(club.id);
  const removeMember = useRemoveMember(club.id);
  const [editing, setEditing] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-base">Membros da equipe</CardTitle>
        <CardDescription>
          Cada membro tem um card com privacidade por campo. Edite as informações e a visibilidade pelo botão de edição.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((m) => {
              const owner = isClubOwner(club, m);
              const canEdit = canEditMember(club, m, { user_id: viewerUid, role: CLUB_ROLE.ADMIN }, viewerUid);
              const canRemove = !owner && m.user_id !== viewerUid;
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
                    <Badge variant={owner ? 'warning' : 'outline'} className="rounded-full">
                      {owner ? 'Proprietário' : (m.role === CLUB_ROLE.ADMIN ? 'Admin' : 'Membro')}
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
                    <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
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
      </CardContent>
    </Card>
  );
}
