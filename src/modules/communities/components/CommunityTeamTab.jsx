import React, { useState } from 'react';
import { toast } from 'sonner';
import { Shield, ShieldAlert, Trash2, MoreVertical, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useCommunityMembers, useSetCommunityMemberRole, useSetCommunityMemberPermissions, useRemoveCommunityMember } from '@/modules/communities/hooks/useCommunities';
import { COMMUNITY_ROLE, COMMUNITY_ROLE_LABELS, COMMUNITY_PERMISSION_KEYS, COMMUNITY_PERMISSION_LABELS } from '@/modules/communities/domain/constants';
import { isCommunityOwner, hasCommunityPermission, effectiveCommunityPermissions } from '@/modules/communities/domain/permissions';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

export default function CommunityTeamTab({ community, membership }) {
  const { data: members = [], isLoading } = useCommunityMembers(community.id);

  if (isLoading) return <div>Carregando equipe...</div>;

  return (
    <div className="space-y-4">
      <section className="arena-section-card rounded-xl">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Membros da Comunidade</h3>
          <p className="arena-section-card-description">Gerencie os membros e suas permissões.</p>
        </div>
        <div className="arena-section-card-body space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2">
            {members.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                community={community}
                myMembership={membership}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MemberItem({ member, community, myMembership }) {
  const { user } = useAuth();
  const setRole = useSetCommunityMemberRole(community.id);
  const remove = useRemoveCommunityMember(community.id);
  const [editingPerms, setEditingPerms] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isMe = member.user_id === user?.uid;
  const targetIsOwner = isCommunityOwner(community, member, user?.uid);
  const amIOwner = isCommunityOwner(community, myMembership, user?.uid);
  const amIAdmin = myMembership?.role === COMMUNITY_ROLE.ADMIN;

  const targetIsAdmin = member.role === COMMUNITY_ROLE.ADMIN;

  const canManageTarget = !isMe && !targetIsOwner && (amIOwner || (amIAdmin && !targetIsAdmin));

  const handleSetRole = async (role) => {
    try {
      await setRole.mutateAsync({ targetUserId: member.user_id, role });
      toast.success('Função atualizada.');
    } catch (e) {
      toast.error('Erro ao atualizar função.');
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync(member.user_id);
      toast.success('Membro removido.');
    } catch (e) {
      toast.error('Erro ao remover membro.');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <UserAvatar uid={member.user_id} className="h-10 w-10 border border-border" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {member.user_name || member.user_email || 'Membro'}
                {isMe && <span className="text-muted-foreground font-normal ml-1">(Você)</span>}
              </span>
              {targetIsOwner && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
              {!targetIsOwner && targetIsAdmin && <Shield className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-1 mt-0.5">
              <span className="capitalize">{COMMUNITY_ROLE_LABELS[member.role] || member.role}</span>
              {member.permissions && Object.keys(member.permissions).length > 0 && !targetIsOwner && !targetIsAdmin && (
                <span>· Permissões personalizadas</span>
              )}
            </div>
          </div>
        </div>

        {canManageTarget && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {targetIsAdmin ? (
                <DropdownMenuItem onClick={() => handleSetRole(COMMUNITY_ROLE.MEMBER)}>Remover de Admin</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleSetRole(COMMUNITY_ROLE.ADMIN)}>Tornar Admin</DropdownMenuItem>
              )}
              {!targetIsAdmin && (
                <DropdownMenuItem onClick={() => setEditingPerms(true)}>Ajustar permissões...</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmRemove(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                Remover da comunidade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remover membro"
        description="Tem certeza que deseja remover este usuário da comunidade?"
        confirmLabel="Remover"
        destructive
        loading={remove.isPending}
        onConfirm={handleRemove}
      />

      <PermissionsDialog
        open={editingPerms}
        onOpenChange={setEditingPerms}
        community={community}
        member={member}
      />
    </>
  );
}

function PermissionsDialog({ open, onOpenChange, community, member }) {
  const [perms, setPerms] = useState({});
  const setPermissions = useSetCommunityMemberPermissions(community.id);

  React.useEffect(() => {
    if (open) {
      setPerms(member?.permissions || {});
    }
  }, [open, member]);

  const toggle = (key) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await setPermissions.mutateAsync({ targetUserId: member.user_id, permissions: perms });
      toast.success('Permissões atualizadas.');
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao salvar permissões.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões personalizadas</DialogTitle>
          <DialogDescription>
            Atribua permissões específicas para este membro sem torná-lo um administrador completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {COMMUNITY_PERMISSION_KEYS.map((key) => (
            <div key={key} className="flex items-start space-x-3 space-y-0">
               <Checkbox
                id={`perm-${key}`}
                checked={perms[key] === true}
                onCheckedChange={() => toggle(key)}
              />
              <div className="space-y-1 leading-none">
                <label htmlFor={`perm-${key}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {COMMUNITY_PERMISSION_LABELS[key]}
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={setPermissions.isPending}>Salvar permissões</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
