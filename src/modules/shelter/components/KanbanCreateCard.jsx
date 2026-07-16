/**
 * KanbanCreateCard — formulário inline para criar card rápido
 */
import { useState } from 'react';
import { useCardMutations } from '../hooks/useKanban';
import { CARD_TYPE_LABELS } from '../domain/operational/kanban';

export function KanbanCreateCard({ boardId, columnId, clubId, onClose }) {
  const { createCard } = useCardMutations(clubId, boardId);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('other');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createCard.mutateAsync({
      board_id: boardId,
      column_id: columnId,
      title: title.trim(),
      type,
      priority,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-2.5 shadow-md border border-blue-200 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do card..."
        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        maxLength={200}
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none"
        >
          {Object.entries(CARD_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none"
        >
          <option value="low">🟢 Baixa</option>
          <option value="medium">🟡 Média</option>
          <option value="high">🟠 Alta</option>
          <option value="urgent">🔴 Urgente</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createCard.isPending || !title.trim()}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded py-1.5 font-medium transition-colors"
        >
          {createCard.isPending ? 'Salvando...' : 'Criar'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>
    </form>
  );
}
