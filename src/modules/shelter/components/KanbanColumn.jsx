/**
 * @fileoverview KanbanColumn — coluna do kanban (Fase 15).
 *
 * Header com título, cor, contagem de cards, WIP badge.
 * Drop zone para drag-and-drop.
 * Botão "+ Card" inline e menu kebab para editar/deletar.
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useState } from 'react';
import { Plus, MoreVertical, AlertTriangle, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/lib/utils';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { KanbanCard } from './KanbanCard';
import { checkWipLimit, sortCardsByOrder } from '@/modules/shelter/domain/operational/kanban';

export function KanbanColumn({
  column,
  cards = [],
  isDragOver = false,
  onAddCard,
  onCardClick,
  onCardMenuClick,
  onCardDragStart,
  onCardDragEnd,
  onColumnMenu,
  onEditColumn,
  onDeleteColumn,
  onDropCard,
  testId = 'kanban-column',
  concludedColumnSlug = 'concluida',
}) {
  const [dragOver, setDragOver] = useState(false);

  const sortedCards = sortCardsByOrder(cards);
  const wip = checkWipLimit(column, sortedCards.length);
  const isConcluded = column?.slug === concludedColumnSlug;

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOver) setDragOver(true);
  }
  function handleDragLeave(e) {
    // Só limpa se saiu de fato (não ao entrar em filho)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId && typeof onDropCard === 'function') {
      onDropCard(cardId, column);
    }
  }

  const overLimit = wip === 'over' || wip === 'at_limit';

  return (
    <div
      data-testid={testId}
      data-column-id={column?.id}
      data-column-slug={column?.slug}
      className={cn(
        'flex flex-col bg-muted/40 rounded-lg border min-w-[280px] max-w-[320px] w-[300px] shrink-0',
        'h-full',
        (isDragOver || dragOver) && 'ring-2 ring-primary border-primary',
        overLimit && 'ring-1 ring-amber-400',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column?.color || '#94a3b8' }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold truncate" data-testid={`${testId}-title`}>
            {column?.title || 'Sem título'}
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
            {sortedCards.length}
          </Badge>
          {column?.wip_limit != null && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 shrink-0',
                overLimit ? 'text-amber-700 border-amber-300 bg-amber-50' : 'text-muted-foreground',
              )}
              data-testid={`${testId}-wip`}
            >
              {overLimit && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              WIP {sortedCards.length}/{column.wip_limit}
            </Badge>
          )}
          {isConcluded && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-300 bg-emerald-50">
              ✓
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.isArray(column?.responsible_uids) && column.responsible_uids.length > 0 && (
            <span
              className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5"
              title={`${column.responsible_uids.length} responsável(eis)`}
            >
              <Users className="h-3 w-3" />
              {column.responsible_uids.length}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Ações da coluna"
                data-testid={`${testId}-menu`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEditColumn && onEditColumn(column)}
                data-testid={`${testId}-edit`}
              >
                <Edit className="h-3.5 w-3.5 mr-2" /> Editar coluna
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onColumnMenu && onColumnMenu(column)}
              >
                <Users className="h-3.5 w-3.5 mr-2" /> Definir responsáveis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteColumn && onDeleteColumn(column)}
                className="text-red-600"
                data-testid={`${testId}-delete`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Deletar coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2" data-testid={`${testId}-cards`}>
        {sortedCards.length === 0 ? (
          <div
            className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-muted rounded-md"
            data-testid={`${testId}-empty`}
          >
            Nenhum card
          </div>
        ) : (
          sortedCards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick && onCardClick(card)}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onMenuClick={onCardMenuClick}
              testId={`${testId}-card`}
              concludedColumnSlug={concludedColumnSlug}
            />
          ))
        )}
      </div>

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onAddCard && onAddCard(column)}
          data-testid={`${testId}-add-card`}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar card
        </Button>
      </div>
    </div>
  );
}

export default KanbanColumn;
