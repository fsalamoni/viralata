/**
 * @fileoverview Test do useKanban useCardMutations (TASK-004).
 *
 * Verifica que moveCard mutation passa o UID do usuário para o
 * service kanbanService.moveCard (TASK-004: drag-and-drop persistente).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMoveCard = vi.fn();
const mockAuth = { user: { uid: 'user-123' } };

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => mockAuth,
}));
vi.mock('@/modules/shelter/services/kanbanService', () => ({
  moveCard: (...args) => mockMoveCard(...args),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  toggleChecklistItem: vi.fn(),
  addChecklistItem: vi.fn(),
}));
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));

import { useCardMutations } from './useKanban.js';

let qc;
function TestHarness() {
  const r = useCardMutations('club-1', 'board-1');
  // expõe em window
  if (typeof window !== 'undefined') window.__mutations = r;
  return null;
}

describe('useCardMutations (TASK-004)', () => {
  beforeEach(() => {
    mockMoveCard.mockClear();
    mockMoveCard.mockResolvedValue({ ok: true });
  });

  it('moveCard.mutationFn passa o uid do usuário (3º arg)', async () => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<QueryClientProvider client={qc}><TestHarness /></QueryClientProvider>);
    });
    const { moveCard } = window.__mutations;
    expect(moveCard).toBeDefined();
    await act(async () => {
      await moveCard.mutateAsync({
        cardId: 'card-1',
        targetColumnId: 'col-2',
        newOrder: 0,
      });
    });
    expect(mockMoveCard).toHaveBeenCalledWith(
      'club-1',
      'card-1',
      'user-123',
      expect.objectContaining({ target_column_id: 'col-2', new_order: 0 }),
    );
    root.unmount();
  });
});
