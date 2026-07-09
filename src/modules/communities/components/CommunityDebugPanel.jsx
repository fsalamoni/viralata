/**
 * Painel de diagnóstico para a página de comunidade. Mostra dados de
 * permissão de forma legível (sem expor informação sensível) para ajudar
 * a entender por que o usuário (a) tem ou (b) não tem acesso admin.
 *
 * Se a comunidade for LEGADA (community.owner_id == null), mostra um
 * botão "Definir como dono" que faz claim do owner_id. Esse caminho é
 * seguro porque:
 *  - Só aparece se owner_id for null (não rouba comunidades com dono)
 *  - Seta owner_id = user.uid (não dá pra setar pra outro user)
 *  - Firestore rule reforça a mesma invariante server-side
 *
 * REMOVER quando não houver mais comunidades órfãs em produção.
 */
import { useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isCommunityOwner, hasAnyCommunityPermission } from '../domain/permissions';
import { claimCommunityOwnership } from '../services/communityService';
import { toast } from 'sonner';

function short(s) {
  if (!s) return '∅';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

export default function CommunityDebugPanel({ community, membership, user, canAdmin, isMember, onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  if (!community) return null;
  const ownerMatch = isCommunityOwner(community, membership, user?.uid);
  const anyPerm = hasAnyCommunityPermission(community, membership, user?.uid);
  const isOrphan = !community.owner_id;

  const handleClaim = async () => {
    if (!user?.uid) return;
    if (!confirm('Definir você como dono desta comunidade? Esta ação não pode ser desfeita sem platform_admin.')) {
      return;
    }
    setClaiming(true);
    try {
      await claimCommunityOwnership(community.id, user.uid);
      toast.success('Você agora é o dono desta comunidade!');
      onClaimed?.();
    } catch (err) {
      toast.error(err?.message || 'Erro ao reivindicar a comunidade.');
      console.error('[claimCommunity]', err);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      data-testid="community-debug-panel"
      role="status"
      className="mx-4 sm:mx-0 rounded-2xl border-2 border-warning/40 bg-warning/5 p-4 text-xs space-y-3"
    >
      <div className="flex items-center gap-2 font-bold text-warning">
        <Info className="h-4 w-4" />
        <span>Diagnóstico temporário — comunidade</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-foreground/80">
        <div>community.id: <span className="font-bold">{short(community.id)}</span></div>
        <div>community.owner_id: <span className="font-bold">{short(community.owner_id)}</span></div>
        <div>user.uid: <span className="font-bold">{short(user?.uid)}</span></div>
        <div>user.email: <span className="font-bold">{user?.email || '∅'}</span></div>
        <div>
          owner_id === user.uid?:{' '}
          <span className={`font-bold ${ownerMatch ? 'text-emerald-700' : 'text-destructive'}`}>
            {String(ownerMatch)}
          </span>
        </div>
        <div>
          hasAnyCommunityPermission(...)?:{' '}
          <span className={`font-bold ${anyPerm ? 'text-emerald-700' : 'text-destructive'}`}>
            {String(anyPerm)}
          </span>
        </div>
        <div>
          canAdmin (usado pela UI):{' '}
          <span className={`font-bold ${canAdmin ? 'text-emerald-700' : 'text-destructive'}`}>
            {String(canAdmin)}
          </span>
        </div>
        <div>
          isMember (usado pela UI):{' '}
          <span className={`font-bold ${isMember ? 'text-emerald-700' : 'text-destructive'}`}>
            {String(isMember)}
          </span>
        </div>
        <div>
          membership:{' '}
          <span className="font-bold">
            {membership ? `role=${membership.role} perms=${JSON.stringify(membership.permissions || {})}` : 'null (legacy / não carregou)'}
          </span>
        </div>
        <div>member_count: <span className="font-bold">{community.member_count ?? '∅'}</span></div>
      </div>

      {isOrphan && (
        <div className="rounded-xl border border-warning/30 bg-background/40 p-3 space-y-2">
          <p className="text-foreground/80">
            Esta comunidade não tem <code className="font-mono">owner_id</code> definido (criada em versão
            antiga do app). Se você é o criador dela, clique abaixo para se declarar dono:
          </p>
          <Button
            size="sm"
            variant="default"
            onClick={handleClaim}
            disabled={claiming || !user?.uid}
            data-testid="community-claim-button"
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            {claiming ? 'Definindo como dono...' : 'Definir como dono desta comunidade (legacy)'}
          </Button>
          {!user?.uid && (
            <p className="text-destructive text-xs">Você precisa estar logado para reivindicar a comunidade.</p>
          )}
        </div>
      )}
    </div>
  );
}