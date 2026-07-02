import { describe, it, expect } from 'vitest';
import { groupByMonth, groupByField } from './metricsService.js';

describe('groupByMonth', () => {
  const now = new Date(2026, 6, 1); // 1 jul 2026

  it('cria um bucket vazio por mês quando não há documentos', () => {
    const result = groupByMonth([], 'created_at', 3, now);
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.count === 0)).toBe(true);
    expect(result[result.length - 1].month).toBe('2026-07');
  });

  it('conta documentos no mês correto (Timestamp com seconds)', () => {
    const docs = [
      { created_at: { seconds: new Date(2026, 5, 15).getTime() / 1000 } }, // jun/2026
      { created_at: { seconds: new Date(2026, 5, 20).getTime() / 1000 } }, // jun/2026
      { created_at: { seconds: new Date(2026, 6, 1).getTime() / 1000 } },  // jul/2026
    ];
    const result = groupByMonth(docs, 'created_at', 3, now);
    const june = result.find((b) => b.month === '2026-06');
    const july = result.find((b) => b.month === '2026-07');
    expect(june.count).toBe(2);
    expect(july.count).toBe(1);
  });

  it('ignora documentos sem a data ou fora da janela de meses', () => {
    const docs = [
      { created_at: null },
      { created_at: { seconds: new Date(2020, 0, 1).getTime() / 1000 } }, // muito antigo
    ];
    const result = groupByMonth(docs, 'created_at', 3, now);
    expect(result.every((b) => b.count === 0)).toBe(true);
  });
});

describe('groupByField', () => {
  it('agrupa e ordena do maior para o menor', () => {
    const docs = [{ state: 'SP' }, { state: 'SP' }, { state: 'RJ' }, { state: 'MG' }];
    const result = groupByField(docs, 'state');
    expect(result[0]).toEqual({ name: 'SP', count: 2 });
    expect(result).toHaveLength(3);
  });

  it('agrupa valores ausentes como "Não informado"', () => {
    const docs = [{ state: '' }, {}, { state: 'SP' }];
    const result = groupByField(docs, 'state');
    const missing = result.find((r) => r.name === 'Não informado');
    expect(missing.count).toBe(2);
  });

  it('respeita o limite máximo de itens', () => {
    const docs = Array.from({ length: 15 }, (_, i) => ({ state: `E${i}` }));
    const result = groupByField(docs, 'state', 5);
    expect(result).toHaveLength(5);
  });
});
