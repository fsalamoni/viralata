/**
 * @fileoverview PostAdoptionReturnedList — lista de adoções devolvidas
 * no dashboard do abrigo (TASK-308).
 *
 * Mostra post_adoptions com status='returned', incluindo motivo e data.
 * Timeline visual: adoção → devolução com razão.
 * Gated por feature flag SHELTER_POST_ADOPTION_RETURN (default OFF).
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Undo2, Calendar, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { parseTimestamp } from '@/core/utils/timestamp';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

const STATUS_LABELS = {
  returned: 'Devolvido',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_TONES = {
  returned: 'bg-destructive/10 text-destructive border-destructive/30',
  active: 'bg-primary/10 text-primary border-primary/30',
  paused: 'bg-secondary text-secondary-foreground border-border',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

function formatDate(value) {
  if (!value) return '—';
  const d = value?.toDate ? parseTimestamp(value) : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function ReturnItem({ post }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={STATUS_TONES[post.status] || ''}>
          {STATUS_LABELS[post.status] || post.status}
        </Badge>
        {post.returned_at && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Devolvido em {formatDate(post.returned_at)}
          </span>
        )}
        {post.adoption_date && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Undo2 className="h-3 w-3" />
            Adotado em {formatDate(post.adoption_date)}
          </span>
        )}
        {post.pet_id && (
          <Link
            to={`/pet/${post.pet_id}`}
            className="ml-auto text-xs font-medium text-primary underline"
          >
            Ver pet
          </Link>
        )}
        {post.return_reason && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <MessageSquare className="mr-1 h-3 w-3" />
            {expanded ? 'Ocultar' : 'Ver'} motivo
            {expanded ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {expanded && post.return_reason && (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs font-semibold text-destructive">Motivo da devolução</p>
          <p className="mt-1 text-sm text-foreground">{post.return_reason}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Lista de adoções com status='returned' para o dashboard do abrigo.
 *
 * @param {{ shelterClubId: string }} props
 */
export function PostAdoptionReturnedList({ shelterClubId }) {
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_POST_ADOPTION_RETURN);

  const { data: returned = [], isLoading, isError } = useQuery({
    queryKey: ['shelter', shelterClubId, 'postAdoptionReturned'],
    queryFn: async () => {
      if (!db || !shelterClubId) return [];
      const q = query(
        collectionGroup(db, 'post_adoption'),
        where('shelter_club_id', '==', shelterClubId),
        where('status', '==', 'returned'),
        orderBy('returned_at', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: Boolean(shelterClubId && enabled),
  });

  if (!enabled) return null;

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
          <Undo2 className="h-4 w-4 text-destructive" />
          Devoluções pós-adoção
        </h3>
        <p className="arena-section-card-description">
          Histórico de adoções devolvidas ao abrigo.
        </p>
      </div>
      <div className="arena-section-card-body">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar as devoluções.
          </p>
        )}
        {!isLoading && !isError && returned.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma devolução registrada.
          </p>
        )}
        {!isLoading && !isError && returned.length > 0 && (
          <div className="space-y-2">
            {returned.map((post) => (
              <ReturnItem key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PostAdoptionReturnedList;
