import React, { useState } from 'react';
import { toast } from 'sonner';
import { Mail, MoreVertical, Phone, Shield, ShieldCheck, UserMinus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useClubMembers, useSetMemberRole, useSetMemberPermissions, useRemoveMember,
} from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, CLUB_ROLE_LABELS, CLUB_PERMISSION } from '@/modules/organizations/domain/constants';
import { isClubOwner } from '@/modules/organizations/domain/permissions';

function initials(name) {
  return String(name || 'A').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
}

export default function ClubMembersTab({ clubId, isAdmin, club }) {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useClubMembers(clubId);
  const setRole = useSetMemberRole(clubId);
  const setPermissions = useSetMemberPermissions(clubId);
  const removeMember = useRemoveMember(clubId);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const sorted = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === CLUB_ROLE.ADMIN ? -1 : 1;
    return String(a.user_name || '').localeCompare(String(b.user_name || ''), 'pt-BR');
  });

  const handleRole = async (member, role) => {
    try {
      await setRole.mutateAsync({ member, role });
      toast.success(role === CLUB_ROLE.ADMIN ? 'Membro promovido a administrador.' : 'Administrador rebaixado a membro.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a função.');
    }
  };

  const handleToggleEditPets = async (member, checked) => {
    try {
      await setPermissions.mutateAsync({ member, permissions: { ...member.permissions, [CLUB_PERMISSION.ANIMALS]: checked } });
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a permissão.');
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeMember.mutateAsync(confirmRemove);
      toast.success('Membro removido do clube.');
      setConfirmRemove(null);
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover o membro.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (members.length === 0) {
    return <EmptyState icon={Shield} title="Sem membros" description="Convide pessoas com o código do clube." />;
  }

  return (
    <div className="space-y-3">
      {sorted.map((member) => {
        const isSelf = member.user_id === user?.uid;
        const isOwner = isClubOwner(club, member);
        return (
          <Card key={member.id} className="rounded-xl">
            <CardContent className="flex items-center gap-3 p-3 sm:p-4">
              {member.photo_url ? (
                <img src={member.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-full border border-primary/10 object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {initials(member.user_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{member.user_name}</span>
                  {isSelf && <span className="text-xs text-slate-400">(você)</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  {member.user_email && (
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {member.user_email}</span>
                  )}
                </div>
              </div>
              <Badge variant={member.role === CLUB_ROLE.ADMIN ? 'warning' : 'secondary'} className="shrink-0 rounded-full">
                {isOwner ? 'Proprietário' : (CLUB_ROLE_LABELS[member.role] || member.role)}
              </Badge>

              {isAdmin && member.role !== CLUB_ROLE.ADMIN && (
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                  Editar pets
                  <Switch
                    checked={member.permissions?.animals === true || member.permissions?.edit_pets === true}
                    onCheckedChange={(v) => handleToggleEditPets(member, v)}
                    disabled={setPermissions.isPending}
                  />
                </label>
              )}

              {isAdmin && !isSelf && !isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.role === CLUB_ROLE.ADMIN ? (
                      <DropdownMenuItem onClick={() => handleRole(member, CLUB_ROLE.MEMBER)}>
                        <Shield className="mr-2 h-4 w-4" /> Rebaixar a membro
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleRole(member, CLUB_ROLE.ADMIN)}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Tornar administrador
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmRemove(member)}>
                      <UserMinus className="mr-2 h-4 w-4" /> Remover do clube
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(v) => !v && setConfirmRemove(null)}
        title="Remover membro"
        description={confirmRemove ? `Tem certeza que deseja remover ${confirmRemove.user_name} do clube?` : ''}
        confirmLabel="Remover"
        destructive
        loading={removeMember.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
