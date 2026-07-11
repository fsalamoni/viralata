/**
 * KanbanPage — página principal do Kanban
 */
import { useState } from 'react';
import { useBoards, useCards, useBoardMutations } from '../hooks/useKanban';
import { KanbanBoard } from './KanbanBoard';
import { KanbanCreateColumn } from './KanbanCreateColumn';
import { KanbanCardModal } from './KanbanCardModal';

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
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando boards...</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Nenhum board encontrado.</p>
        <button
          onClick={() => createBoard.mutate({ name: 'Quadro Principal', default_view: 'board' })}
          disabled={createBoard.isPending}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg px-4 py-2 font-medium"
        >
          {createBoard.isPending ? 'Criando...' : 'Criar primeiro board'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: seletor de board + botão adicionar */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <select
          value={boardId || ''}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button
          onClick={() => createBoard.mutate({ name: 'Novo Board', default_view: 'board' })}
          disabled={createBoard.isPending}
          className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2 transition-colors"
        >
          + Novo board
        </button>
      </div>

      {/* Board */}
      {cardsLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Carregando cards...</div>
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
