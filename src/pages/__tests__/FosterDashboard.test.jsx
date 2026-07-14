/**
 * @fileoverview Tests for FosterDashboard (TASK-306).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' } }),
}));
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  limit: vi.fn(),
}));

const FosterDashboard = (await import('@/pages/FosterDashboard.jsx')).default;

describe('FosterDashboard (TASK-306)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof FosterDashboard).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <FosterDashboard />
          </MemoryRouter>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
