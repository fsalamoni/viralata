import { describe, it, expect } from 'vitest';
import { groupByDay } from './metricsService';

describe('groupByDay (TASK-172)', () => {
  const now = new Date('2026-07-12T12:00:00Z');
  it('cria N buckets diários e conta docs no dia certo', () => {
    const docs = [
      { created_at: '2026-07-12T08:00:00Z' },
      { created_at: '2026-07-12T09:00:00Z' },
      { created_at: '2026-07-10T09:00:00Z' },
    ];
    const out = groupByDay(docs, 'created_at', 5, now);
    expect(out).toHaveLength(5);
    expect(out[out.length - 1].count).toBe(2);
    expect(out[out.length - 3].count).toBe(1);
  });
  it('ignora docs fora da janela e datas inválidas', () => {
    const docs = [{ created_at: '2020-01-01T00:00:00Z' }, { created_at: null }, {}];
    const out = groupByDay(docs, 'created_at', 7, now);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });
});
