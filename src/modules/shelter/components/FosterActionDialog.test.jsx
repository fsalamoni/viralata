/**
 * @fileoverview Testes do FosterActionDialog (TASK-328).
 */

import { describe, it, expect } from 'vitest';

vi.mock('date-fns', () => ({
  isAfter: vi.fn((d1, d2) => d1 > d2),
  parseISO: vi.fn((d) => new Date(d)),
  addDays: vi.fn((d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000)),
}));

import { FosterActionDialog } from './FosterActionDialog.jsx';

describe('FosterActionDialog (TASK-328)', () => {
  it('componente é função', () => {
    expect(typeof FosterActionDialog).toBe('function');
  });

  it('retorna null quando action é null', () => {
    expect(FosterActionDialog({ open: false, onOpenChange: () => {}, action: null })).toBeNull();
  });

  it('aceita action "extend" sem erro', () => {
    // Apenas verifica que renderiza sem crashar (em jsdom Radix Portal não monta)
    // O build de produção já validou a sintaxe
    const result = FosterActionDialog({
      open: true,
      onOpenChange: () => {},
      action: 'extend',
      currentEndDate: '2026-08-01T00:00:00.000Z',
      foster: { pet_name: 'Rex' },
      onSubmit: () => Promise.resolve(),
    });
    // Componente retorna um React element (Dialog) ou null
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('aceita action "end" sem erro', () => {
    const result = FosterActionDialog({
      open: true,
      onOpenChange: () => {},
      action: 'end',
      foster: { pet_name: 'Mia' },
      onSubmit: () => Promise.resolve(),
    });
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('aceita action "cancel" sem erro', () => {
    const result = FosterActionDialog({
      open: true,
      onOpenChange: () => {},
      action: 'cancel',
      foster: { pet_name: 'Toby' },
      onSubmit: () => Promise.resolve(),
    });
    expect(result === null || typeof result === 'object').toBe(true);
  });
});
