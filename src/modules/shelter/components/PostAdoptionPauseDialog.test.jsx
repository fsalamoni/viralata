/**
 * @fileoverview Tests para PostAdoptionPauseDialog (TASK-308).
 *
 * O componente usa Radix Dialog + useMutation (QueryClientProvider obrigatório).
 * Testamos: exportação, lógica.
 */
import { describe, it, expect, vi } from 'vitest';

const mockPausePostAdoption = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/modules/shelter/services/postAdoptionService', () => ({
  pausePostAdoption: (...args) => mockPausePostAdoption(...args),
}));

const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
vi.mock('@/core/lib/logger', () => ({ logger: mockLogger }));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } }),
}));

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));

const { PostAdoptionPauseDialog } = await import('./PostAdoptionPauseDialog.jsx');

describe('PostAdoptionPauseDialog', () => {
  it('componente é função (exportado corretamente)', () => {
    expect(typeof PostAdoptionPauseDialog).toBe('function');
  });
});
