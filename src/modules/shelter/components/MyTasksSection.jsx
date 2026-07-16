/**
 * @fileoverview MyTasksSection — dashboard pessoal do usuário.
 *
 * Lista todos os cards Kanban onde o usuário logado é `assignee`,
 * cross-shelter (todos os abrigos onde ele participa). Gated pela
 * flag `SHELTER_KANBAN`. Click em um card abre o detalhe do card
 * (rota do KanbanBoard do abrigo, com boardId + cardId).
 *
 * TASK-150 (Regra A §1.4 perfil + SHELTER_MGMT §Fase 14).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, AlertCircle, Clock, Building2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyCardsAll } from '@/modules/shelter/hooks/useKanban';

const STATUS_LABELS = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  done: 'Concluído',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
};

const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_STYLES = {
  low: 'bg-secondary text-secondary-foreground',
  medium: 'bg-blue-100 text-blue-900',
  high: 'bg-orange-100 text-orange-900',
  urgent: 'bg-red-100 text-red-900',
};

function formatDueDate(dueAt) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 0) return `Atrasado ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays === 1) return 'Vence amanhã';
  if (diffDays < 7) return `Vence em ${diffDays}d`;
  return d.toLocaleDateString('pt-BR');
}

function isOverdue(dueAt, status) {
  if (!dueAt || status === 'done' || status === 'cancelled') return false;
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function MyTasksSection({ userUid }) {
  const { data: cards = [], isLoading, isError } = useMyCardsAll(userUid);

  if (isLoading) {
    return (
      <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
            <CheckSquare className="w-[19px] h-[19px] text-primary" /> Minhas tarefas
          </h3>
        </div>
        <div className="arena-section-card-body space-y-2 p-0">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
            <CheckSquare className="w-[19px] h-[19px] text-primary" /> Minhas tarefas
          </h3>
        </div>
        <div className="arena-section-card-body p-0">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar suas tarefas agora.
          </p>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
            <CheckSquare className="w-[19px] h-[19px] text-primary" /> Minhas tarefas
          </h3>
          <p className="arena-section-card-description">
            Cards do Kanban onde você é responsável (assignee), em todos os abrigos onde você participa.
          </p>
        </div>
        <div className="arena-section-card-body p-0">
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa atribuída a você"
            description="Quando algum abrigo te designar como responsável por um card, ele aparece aqui."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="arena-section-card rounded-[24px] p-6 lg:p-7">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
          <CheckSquare className="w-[19px] h-[19px] text-primary" /> Minhas tarefas
        </h3>
        <p className="arena-section-card-description">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'} onde você é responsável, em todos os abrigos.
        </p>
      </div>
      <div className="arena-section-card-body p-0">
        <ul className="space-y-2" role="list" aria-label="Cards onde você é assignee">
          {cards.map((card) => {
            const overdue = isOverdue(card.due_at, card.status);
            const dueLabel = formatDueDate(card.due_at);
            return (
              <li
                key={card.id}
                className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-start gap-3">
                  {/* Coluna (cor) */}
                  {card.column_color && (
                    <span
                      aria-hidden
                      className="mt-1 h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: card.column_color }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/organizacoes/${card.shelter_club_id}/kanban?boardId=${card.board_id}&cardId=${card.id}`}
                      className="block text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {card.title || '(sem título)'}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                      {card.shelter_club_name && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {card.shelter_club_name}
                        </span>
                      )}
                      {card.board_name && (
                        <span>· {card.board_name}</span>
                      )}
                      {card.column_name && (
                        <span>· {card.column_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        PRIORITY_STYLES[card.priority] || PRIORITY_STYLES.medium
                      }`}
                    >
                      {PRIORITY_LABELS[card.priority] || card.priority}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      {STATUS_LABELS[card.status] || card.status}
                    </span>
                    {dueLabel && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10.5px] ${
                          overdue ? 'font-bold text-red-600' : 'text-muted-foreground'
                        }`}
                      >
                        {overdue ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default MyTasksSection;
