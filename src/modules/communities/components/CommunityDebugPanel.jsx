/**
 * Painel de diagnóstico para a página de comunidade. Mostra dados de
 * permissão de forma legível (sem expor informação sensível) para ajudar
 * a entender por que o usuário (a) tem ou (b) não tem acesso admin.
 *
 * REMOVER quando o bug estiver resolvido. É temporário.
 *
 * Mostra:
 *  - community.id (últimos 8 chars)
 *  - community.owner_id (últimos 8 chars)
 *  - user.uid (últimos 8 chars)
 *  - match? owner_id === user.uid (sim/não)
 *  - membership (se existe): role + permissions keys
 *  - canAdmin (true/false) — o que o app está usando pra gating
 *  - isMember (true/false)
 *  - isOrgCreator (fallback helper)
 */
import { Info } from 'lucide-react';
import { isCommunityOwner, hasAnyCommunityPermission } from '../domain/permissions';

function short(s) {
  if (!s) return '∅';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

export default function CommunityDebugPanel({ community, membership, user, canAdmin, isMember }) {
  if (!community) return null;
  const ownerMatch = isCommunityOwner(community, membership, user?.uid);
  const anyPerm = hasAnyCommunityPermission(community, membership, user?.uid);
  return (
    <div
      data-testid="community-debug-panel"
      role="status"
      className="mx-4 sm:mx-0 rounded-2xl border-2 border-warning/40 bg-warning/5 p-4 text-xs space-y-2"
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
    </div>
  );
}