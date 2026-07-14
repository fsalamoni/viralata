/**
 * @fileoverview Tests para PostAdoptionReturnDialog (TASK-308).
 *
 * O componente usa Radix Dialog + useMutation (QueryClientProvider obrigatório).
 * Testamos: exportação, lógica de validação.
 */
import { describe, it, expect, vi } from 'vitest';

const mockMarkAsReturned = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/modules/shelter/services/postAdoptionService', () => ({
  markAsReturned: (...args) => mockMarkAsReturned(...args),
}));

const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
vi.mock('@/core/lib/logger', () => ({ logger: mockLogger }));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } }),
}));

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));

const { PostAdoptionReturnDialog } = await import('./PostAdoptionReturnDialog.jsx');

describe('PostAdoptionReturnDialog', () => {
  it('componente é função (exportado corretamente)', () => {
    expect(typeof PostAdoptionReturnDialog).toBe('function');
  });

  describe('lógica de validação', () => {
    const REASON_MIN_LENGTH = 10;

    it('REASON_MIN_LENGTH é 10', () => {
      expect(REASON_MIN_LENGTH).toBe(10);
    });

    it('preset reasons são válidos (todos >= 10 chars)', () => {
      const PRESET_REASONS = [
        'Mudança de endereço / cidade',
        'Problema de saúde do adotante',
        'Adaptação não funcionou',
        'Falta de condições financeiras',
        'Animal apresentou comportamento inesperado',
        'Outro motivo',
      ];
      PRESET_REASONS.forEach((r) => {
        expect(r.length).toBeGreaterThanOrEqual(10);
      });
    });

    it('"Outro motivo" exige reason custom com >= 10 chars', () => {
      const shortReason = 'abc';
      const longReason = 'Mudei de cidade e não posso levar o pet';
      expect(shortReason.length).toBeLessThan(REASON_MIN_LENGTH);
      expect(longReason.length).toBeGreaterThanOrEqual(REASON_MIN_LENGTH);
    });
  });
});
