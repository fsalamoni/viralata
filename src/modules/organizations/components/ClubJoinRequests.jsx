import React from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from '@/modules/organizations/hooks/useClubs';

/** Pedidos de ingresso pendentes — o admin aprova ou recusa. */
export function ClubJoinRequests({ club }) {
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
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
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
