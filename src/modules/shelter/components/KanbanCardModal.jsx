/**
 * KanbanCardModal — modal de visualização/edição de card
 */
import { confirmDialog } from '@/components/ui/confirm-provider';
import { useState } from 'react';
import { useCardMutations } from '../hooks/useKanban';
import {
  CARD_STATUS_LABELS,
  CARD_PRIORITY_LABELS,
  CARD_TYPE_LABELS,
  CARD_PRIORITY_COLORS,
} from '../domain/operational/kanban';

export function KanbanCardModal({ card, clubId, boardId, onClose }) {
  const { updateCard, deleteCard, toggleChecklistItem, addChecklistItem } = useCardMutations(clubId, boardId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const handleSave = async () => {
    await updateCard.mutateAsync({ cardId: card.id, title, description });
    setEditing(false);
  };

  const handleStatusChange = async (status) => {
    await updateCard.mutateAsync({ cardId: card.id, status });
  };

  const handleAddChecklist = async () => {
    const text = newChecklistItem.trim();
    if (!text) return;
    try {
      await addChecklistItem.mutateAsync({ cardId: card.id, text });
      setNewChecklistItem('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('KanbanCardModal.handleAddChecklist', err);
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDialog({ title: 'Deletar este card?' }))) return;
    await deleteCard.mutateAsync(card.id);
    onClose();
  };

  const completedCount = card.checklist?.filter((i) => i.done).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 flex items-start gap-3">
          <div className="flex-1">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-base font-semibold border border-border rounded px-2 py-1"
              />
            ) : (
              <h2 className="text-base font-semibold text-foreground">{card.title}</h2>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{CARD_TYPE_LABELS[card.type] || card.type}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {Object.entries(CARD_STATUS_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => handleStatusChange(val)}
                  disabled={updateCard.isPending}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    card.status === val
                      ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prioridade</label>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CARD_PRIORITY_COLORS[card.priority] }}
              />
              <span className="text-sm text-foreground">{CARD_PRIORITY_LABELS[card.priority]}</span>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</label>
            {editing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Adicione uma descrição..."
              />
            ) : (
              <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap">
                {card.description || <span className="text-muted-foreground italic">Sem descrição</span>}
              </p>
            )}
          </div>

          {/* Checklist */}
          {(card.checklist?.length > 0 || editing) && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Checklist {completedCount > 0 && <span className="text-emerald-600">({completedCount}/{card.checklist.length})</span>}
              </label>
              <div className="mt-1.5 space-y-1">
                {card.checklist?.map((item, idx) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem.mutate({ cardId: card.id, itemIndex: idx })}
                      className="rounded border-input text-primary"
                    />
                    <span className={`text-sm flex-1 ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Novo item..."
                    className="flex-1 text-sm border border-border rounded px-2 py-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                  />
                  <button onClick={handleAddChecklist} className="text-xs text-primary hover:text-primary/70 font-medium">Adicionar</button>
                </div>
              )}
            </div>
          )}

          {/* Dica assignee */}
          {card.assignees?.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsáveis</label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {card.assignees.map((uid) => (
                  <span key={uid} className="text-xs bg-muted/60 text-muted-foreground rounded-full px-2.5 py-1">
                    👤 {uid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-secondary/30 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleteCard.isPending}
            className="text-sm text-destructive hover:text-destructive/80 disabled:opacity-50"
          >
            Deletar card
          </button>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">Cancelar</button>
                <button onClick={handleSave} disabled={updateCard.isPending} className="text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium">
                  {updateCard.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="text-sm text-blue-500 hover:text-blue-700">Editar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
