/**
 * @fileoverview MyKanbanTasks — card dedicado no Dashboard (Fase 15)
 * mostrando cards onde o usuário é assignee, agrupados por prioridade.
 *
 * Plugado no DashboardPage (Fase 14). Usa `useMyCards`.
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, ArrowRight, Calendar, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyCards } from '@/modules/shelter/hooks/useKanban';
import {
  KANBAN_PRIORITY_LABELS, KANBAN_PRIORITY_TONES,
  KANBAN_CARD_TYPE_LABELS, KANBAN_CARD_TYPE_TONES,
  toMillis, isCardOverdue,
} from '@/modules/shelter/domain/operational/kanban';
import { cn } from '@/core/lib/utils';

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

export function MyKanbanTasks({ clubId, uid, maxItems = 5, concludedColumnSlug = 'concluida' }) {
  const { cards, isLoading, count } = useMyCards(clubId, uid);

  const grouped = useMemo(() => {
    const groups = { urgent: [], high: [], medium: [], low: [] };
    for (const c of cards) {
      const p = c.priority || 'medium';
      if (groups[p]) groups[p].push(c);
      else groups.medium.push(c);
    }
    return groups;
  }, [cards]);

  const sortedAll = useMemo(() => {
    const all = [];
    for (const p of PRIORITY_ORDER) {
      all.push(...grouped[p]);
    }
    return all;
  }, [grouped]);

  const visible = sortedAll.slice(0, maxItems);
  const remaining = Math.max(0, sortedAll.length - visible.length);

  return (
    <Card data-testid="my-kanban-tasks">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Minhas tarefas
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground" data-testid="my-kanban-tasks-empty">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma tarefa atribuída a você.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((card) => {
              const priorityTone = KANBAN_PRIORITY_TONES[card.priority] || KANBAN_PRIORITY_TONES.medium;
              const typeTone = KANBAN_CARD_TYPE_TONES[card.type] || KANBAN_CARD_TYPE_TONES.other;
              const dueMs = toMillis(card.due_at);
              const overdue = isCardOverdue(card, concludedColumnSlug);
              return (
                <div
                  key={card.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border bg-card text-card-foreground hover:bg-muted/40',
                    overdue && 'border-red-300',
                  )}
                  data-testid={`my-kanban-task-${card.id}`}
                >
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', priorityTone)}>
                    {KANBAN_PRIORITY_LABELS[card.priority] || 'Média'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {card.pet_name && <span className="text-muted-foreground">🐾 {card.pet_name} · </span>}
                      {card.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-[10px]', typeTone)}>
                        {KANBAN_CARD_TYPE_LABELS[card.type] || 'Outro'}
                      </Badge>
                      {dueMs && (
                        <span
                          className={cn(
                            'text-[11px] inline-flex items-center gap-0.5',
                            overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(dueMs).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {remaining > 0 && clubId && (
              <Link
                to={`/abrigos/${clubId}/kanban`}
                className="block"
                data-testid="my-kanban-tasks-more"
              >
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver mais {remaining} tarefa{remaining !== 1 ? 's' : ''}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MyKanbanTasks;
