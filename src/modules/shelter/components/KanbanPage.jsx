/**
 * KanbanPage — página principal do Kanban
 */
import { useState } from 'react';
import { useBoards, useCards, useBoardMutations } from '../hooks/useKanban';
import { KanbanBoard } from './KanbanBoard';
import { KanbanCreateColumn } from './KanbanCreateColumn';
import { KanbanCardModal } from './KanbanCardModal';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function KanbanPage({ clubId }) {
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);

  const { data: boards = [], isLoading: boardsLoading } = useBoards(clubId);
  const activeBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];
  const boardId = activeBoard?.id;

  const { data: cards = [], isLoading: cardsLoading } = useCards(clubId, boardId);

  const { createBoard } = useBoardMutations(clubId);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Nenhum board encontrado.</p>
        <Button
          onClick={() => createBoard.mutate({ name: 'Quadro Principal', default_view: 'board' })}
          disabled={createBoard.isPending}
        >
          {createBoard.isPending ? 'Criando...' : 'Criar primeiro board'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: seletor de board + botão adicionar */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <Select value={boardId || ''} onValueChange={setSelectedBoardId}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Selecione o board" />
          </SelectTrigger>
          <SelectContent>
            {boards.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createBoard.mutate({ name: 'Novo Board', default_view: 'board' })}
          disabled={createBoard.isPending}
        >
          + Novo board
        </Button>
      </div>

      {/* Board */}
      {cardsLoading ? (
        <div className="flex items-center justify-center h-48">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <KanbanBoard
          columns={activeBoard?._columns || []}
          cards={cards}
          boardId={boardId}
          clubId={clubId}
          onCardClick={setSelectedCard}
          onAddColumn={() => setAddingColumn(true)}
        />
      )}

      {/* Modal de card */}
      {selectedCard && (
        <KanbanCardModal
          card={selectedCard}
          clubId={clubId}
          boardId={boardId}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* Modal de criar coluna */}
      {addingColumn && boardId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAddingColumn(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <KanbanCreateColumn
              boardId={boardId}
              clubId={clubId}
              onClose={() => setAddingColumn(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
