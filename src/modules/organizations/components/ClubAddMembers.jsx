import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Search, UserPlus, Users, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listAllUsers } from '@/modules/admin/services/adminService';
import {
  useClubMembers,
  useClubInvites,
  useInviteMembersToClub,
  useCancelClubInvite,
} from '@/modules/organizations/hooks/useClubs';

/**
 * Adicionar membros: lista navegável de TODOS os usuários da
 * plataforma, com busca, seleção múltipla e convite em lote. Os convidados
 * recebem um aviso no sino e decidem aceitar ou recusar.
 */
export function ClubAddMembers({ club }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { uid: athlete }
  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: listAllUsers,
    staleTime: 1000 * 60,
  });
  const { data: members = [] } = useClubMembers(club.id);
  const { data: invites = [] } = useClubInvites(club.id);
  const inviteMany = useInviteMembersToClub(club);
  const cancelInvite = useCancelClubInvite(club.id);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const invitedIds = useMemo(() => new Set(invites.map((i) => i.user_id)), [invites]);

  const memberName = (a) => a.platform_name || a.full_name || a.name || 'Usuário';

  // Disponíveis = todos os perfis menos quem já é membro ou já tem convite.
  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return athletes
      .filter((a) => a.id && !memberIds.has(a.id) && !invitedIds.has(a.id))
      .filter((a) => {
        if (!q) return true;
        const hay = `${memberName(a)} ${a.city || ''} ${a.email || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => memberName(a).localeCompare(memberName(b), 'pt-BR'));
  }, [athletes, memberIds, invitedIds, search]);

  const toggle = (a) => setSelected((p) => {
    const n = { ...p };
    if (n[a.id]) delete n[a.id];
    else n[a.id] = a;
    return n;
  });

  const handleInviteSelected = async () => {
    const targets = Object.values(selected).map((a) => ({
      user_id: a.id,
      user_name: memberName(a),
      user_email: a.email || '',
      photo_url: a.photo_url || '',
    }));
    try {
      const { invited, failed } = await inviteMany.mutateAsync(targets);
      setSelected({});
      if (invited > 0) toast.success(`${invited} convite(s) enviado(s).${failed ? ` ${failed} falhou(aram).` : ''}`);
      else toast.error('Não foi possível enviar os convites.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível convidar.');
    }
  };

  const handleCancel = async (inv) => {
    try {
      await cancelInvite.mutateAsync(inv);
      toast.success('Convite cancelado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível cancelar o convite.');
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-6 sm:p-7">
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> Adicionar membros</CardTitle>
        <CardDescription>Selecione usuários da plataforma e envie convites. Eles recebem um aviso e decidem aceitar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-6 pt-0 sm:p-7 sm:pt-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome, cidade ou e-mail"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando usuários…</p>
        ) : available.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            {search.trim() ? 'Nenhum usuário encontrado para esse filtro.' : 'Todos os usuários já são membros ou já foram convidados.'}
          </div>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border border-border p-1.5">
            {available.map((a) => {
              const isSel = !!selected[a.id];
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggle(a)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                    isSel ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-secondary/40'
                  }`}
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'}`}>
                    {isSel && <Check className="h-3 w-3" />}
                  </div>
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-primary/10 object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                      {(memberName(a)[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{memberName(a)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[a.city, a.state].filter(Boolean).join(' / ') || a.email || 'Usuário'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {Object.keys(selected).length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <span className="text-sm font-semibold text-primary">{Object.keys(selected).length} selecionado(s)</span>
            <Button size="sm" onClick={handleInviteSelected} disabled={inviteMany.isPending}>
              {inviteMany.isPending ? 'Enviando...' : 'Enviar convites'}
            </Button>
          </div>
        )}

        {invites.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Convites pendentes ({invites.length})</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {inv.photo_url ? (
                      <img src={inv.photo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                        {(inv.user_name?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-sm text-foreground">{inv.user_name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleCancel(inv.id)} disabled={cancelInvite.isPending}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
