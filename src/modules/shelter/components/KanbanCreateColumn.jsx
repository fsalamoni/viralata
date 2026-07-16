/**
 * KanbanCreateColumn — formulário inline para criar coluna
 */
import { useState } from 'react';
import { useColumnMutations } from '../hooks/useKanban';

const PRESET_COLORS = ['#6B7280', '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6'];

export function KanbanCreateColumn({ boardId, clubId, onClose }) {
  const { createColumn } = useColumnMutations(clubId, boardId);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#6B7280');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createColumn.mutateAsync({
      board_id: boardId,
      title: title.trim(),
      color,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-lg border border-border w-72">
      <h3 className="text-sm font-semibold text-foreground mb-3">Nova coluna</h3>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome da coluna..."
        className="w-full text-sm border border-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-ring"
        maxLength={50}
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-muted-foreground' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createColumn.isPending || !title.trim()}
          className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm rounded-lg py-2 font-medium transition-colors"
        >
          {createColumn.isPending ? 'Salvando...' : 'Criar coluna'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ✕
        </button>
      </div>
    </form>
  );
}
