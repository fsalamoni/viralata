/**
 * @fileoverview Tests do useKanban useCardMutations (TASK-004/TASK-005).
 *
 * Garante que todos os mutations passam o UID do usuário como penúltimo
 * argumento (TASK-004: moveCard; TASK-005: addChecklistItem, etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockMove = vi.fn();
const mockDelete = vi.fn();
const mockAddChecklist = vi.fn();
const mockToggleChecklist = vi.fn();
const mockAuth = { user: { uid: 'user-123' } };

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => mockAuth,
}));
vi.mock('@/modules/shelter/services/kanbanService', () => ({
  createCard: (...args) => mockCreate(...args),
  updateCard: (...args) => mockUpdate(...args),
  moveCard: (...args) => mockMove(...args),
  deleteCard: (...args) => mockDelete(...args),
  toggleChecklistItem: (...args) => mockToggleChecklist(...args),
  addChecklistItem: (...args) => mockAddChecklist(...args),
}));
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));

import { useCardMutations } from './useKanban.js';

let qc;
function TestHarness() {
  const r = useCardMutations('club-1', 'board-1');
  if (typeof window !== 'undefined') window.__mutations = r;
  return null;
}

describe('useCardMutations (TASK-004 + TASK-005)', () => {
  let container, root;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});
    mockMove.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockAddChecklist.mockResolvedValue({});
    mockToggleChecklist.mockResolvedValue({});

    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<QueryClientProvider client={qc}><TestHarness /></QueryClientProvider>);
    });
  });

  it('moveCard: passa uid (3º arg) e payload (4º arg) — TASK-004', async () => {
    const { moveCard } = window.__mutations;
    await act(async () => {
      await moveCard.mutateAsync({ cardId: 'card-1', targetColumnId: 'col-2', newOrder: 0 });
    });
    expect(mockMove).toHaveBeenCalledWith(
      'club-1', 'card-1', 'user-123',
      expect.objectContaining({ target_column_id: 'col-2', new_order: 0 }),
    );
  });

  it('addChecklistItem: passa uid (3º arg) e text (4º arg) — TASK-005', async () => {
    const { addChecklistItem } = window.__mutations;
    await act(async () => {
      await addChecklistItem.mutateAsync({ cardId: 'card-1', text: 'Vacinar' });
    });
    expect(mockAddChecklist).toHaveBeenCalledWith('club-1', 'card-1', 'user-123', 'Vacinar');
  });

  it('createCard: passa uid (2º arg) e payload (3º arg) — TASK-004', async () => {
    const { createCard } = window.__mutations;
    await act(async () => {
      await createCard.mutateAsync({ title: 'Card 1', column_id: 'col-1' });
    });
    expect(mockCreate).toHaveBeenCalledWith(
      'club-1', 'user-123',
      expect.objectContaining({ title: 'Card 1' }),
    );
  });

  it('updateCard: passa uid (3º arg) e updates (4º arg) — TASK-004', async () => {
    const { updateCard } = window.__mutations;
    await act(async () => {
      await updateCard.mutateAsync({ cardId: 'card-1', title: 'Updated' });
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      'club-1', 'card-1', 'user-123',
      expect.objectContaining({ title: 'Updated' }),
    );
  });

  it('deleteCard: passa uid (3º arg) — TASK-004', async () => {
    const { deleteCard } = window.__mutations;
    await act(async () => {
      await deleteCard.mutateAsync('card-1');
    });
    expect(mockDelete).toHaveBeenCalledWith('club-1', 'card-1', 'user-123');
  });

  it('toggleChecklistItem: passa uid (3º arg) e itemIndex (4º arg) — TASK-005', async () => {
    const { toggleChecklistItem } = window.__mutations;
    await act(async () => {
      await toggleChecklistItem.mutateAsync({ cardId: 'card-1', itemIndex: 2 });
    });
    expect(mockToggleChecklist).toHaveBeenCalledWith('club-1', 'card-1', 'user-123', 2);
  });
});
