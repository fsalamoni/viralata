import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/core/lib/useClipboard';
import { useChatUserDirectory } from '@/modules/chat/hooks/useChat';
import {
  useRegenerateInviteCode,
  useDeleteClub,
} from '@/modules/organizations/hooks/useClubs';
import ClubThemingSection from './ClubThemingSection';

export default function ClubAdminTab({ club, isAdmin, canManageTeam }) {
  const navigate = useNavigate();
  const { copy, copied } = useClipboard();
  const regenerate = useRegenerateInviteCode(club.id);
  const deleteClub = useDeleteClub(club.id);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRegenerate = async () => {
    try {
      const code = await regenerate.mutateAsync();
      toast.success(`Novo código gerado: ${code}`);
      setConfirmRegen(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar novo código.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClub.mutateAsync();
      toast.success('Organização excluída.');
      navigate('/organizacoes');
    } catch (err) {
      toast.error(err.message || 'Não foi possível excluir a organização.');
    }
  };

  return (
    <div className="space-y-4">
      {canManageTeam && (
        <>
          <ClubJoinRequests club={club} />
          <ClubAddMembers club={club} />
        </>
      )}

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Você tem acesso a esta aba pela permissão de gerenciar equipe. Configurações da organização e o código
          de convite continuam exclusivos de administradores.
        </p>
      )}

      {isAdmin && (
      <>
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
          <p className="text-xs text-muted-foreground">
            Ao gerar um novo código, o anterior deixa de funcionar imediatamente.
          </p>
        </div>
      </section>

      <ClubThemingSection club={club} />

      <Card className="rounded-xl border-destructive">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
          <CardDescription>A exclusão do clube remove membros, eventos e mural. Não pode ser desfeita.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={deleteClub.isPending}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir organização
          </Button>
        </CardContent>
      </Card>
      </>
      )}

      <ConfirmDialog
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Gerar novo código"
        description="O código atual deixará de funcionar. Deseja continuar?"
        confirmLabel="Gerar novo"
        loading={regenerate.isPending}
        onConfirm={handleRegenerate}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir organização"
        description={`Tem certeza que deseja excluir "${club.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleteClub.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Pedidos de ingresso pendentes — o admin aprova ou recusa. */
function ClubJoinRequests({ club }) {
  const { data: requests = [], isLoading } = useJoinRequests(club.id);
  const approve = useApproveJoinRequest(club.id);
  const reject = useRejectJoinRequest(club.id);

  const handle = async (mutation, request, okMsg) => {
    try {
      await mutation.mutateAsync(request);
      toast.success(okMsg);
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir a ação.');
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base">
          Pedidos de ingresso
          {requests.length > 0 && <Badge variant="warning" className="rounded-full">{requests.length}</Badge>}
        </CardTitle>
        <CardDescription>Pessoas que pediram para entrar na organização.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <UserAvatar name={r.user_name} photoUrl={r.photo_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{r.user_name}</div>
                {r.user_email && <div className="truncate text-xs text-muted-foreground">{r.user_email}</div>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" onClick={() => handle(approve, r, 'Pedido aprovado.')} disabled={approve.isPending}>
                  <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handle(reject, r, 'Pedido recusado.')} disabled={reject.isPending}>
                  <X className="mr-1 h-3.5 w-3.5" /> Recusar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Adicionar membros: lista navegável de TODOS os usuários da
 * plataforma, com busca, seleção múltipla e convite em lote. Os convidados
 * recebem um aviso no sino e decidem aceitar ou recusar.
 */
function ClubAddMembers({ club }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({}); // { uid: athlete }
  const { data: athletes = [], isLoading } = useChatUserDirectory();
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

  const selectedCount = Object.keys(selected).length;

  const toggle = (a) => setSelected((prev) => {
    const next = { ...prev };
    if (next[a.id]) delete next[a.id];
    else next[a.id] = a;
    return next;
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
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> Adicionar membros</CardTitle>
        <CardDescription>Selecione usuários da plataforma e envie convites. Eles recebem um aviso e decidem aceitar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
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
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-4 text-sm text-muted-foreground">
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
                    isSel ? 'border-primary/40 bg-primary/10' : 'border-transparent bg-card hover:bg-secondary'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                  }`}>
                    {isSel && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <UserAvatar name={memberName(a)} photoUrl={a.photo_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{memberName(a)}</div>
                    {(a.city || a.email) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.city ? `${a.city}${a.state ? ` / ${a.state}` : ''}` : a.email}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Button
          onClick={handleInviteSelected}
          disabled={selectedCount === 0 || inviteMany.isPending}
          className="w-full"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          {inviteMany.isPending
            ? 'Enviando…'
            : selectedCount > 0 ? `Convidar selecionados (${selectedCount})` : 'Selecione usuários para convidar'}
        </Button>

        {invites.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Convites pendentes ({invites.length})</div>
            <div className="space-y-1.5">
              {invites.map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5">
                  <UserAvatar name={i.user_name} photoUrl={i.photo_url} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{i.user_name}</span>
                  <button
                    type="button"
                    onClick={() => handleCancel(i)}
                    disabled={cancelInvite.isPending}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    title="Cancelar convite"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
