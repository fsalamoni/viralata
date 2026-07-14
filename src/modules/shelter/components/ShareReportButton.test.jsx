/**
 * @fileoverview Testes do ShareReportButton (TASK-155).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ShareReportButton } from './ShareReportButton.jsx';

describe('ShareReportButton (TASK-155)', () => {
  let container;
  let root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof ShareReportButton).toBe('function');
  });

  it('renderiza botão "Compartilhar" sem crash', async () => {
    await act(async () => {
      root.render(
        <ShareReportButton
          shelterClubId="club-1"
          reportType="rescues"
          actor={{ uid: 'u1', displayName: 'Maria' }}
        />
      );
    });
    expect(container.textContent).toContain('Compartilhar');
  });
});
