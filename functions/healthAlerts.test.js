import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { recordsDueSoon, alertId, processHealthAlerts, ALERT_WINDOW_DAYS } = require('./healthAlertsCore');

const NOW = new Date('2026-07-12T12:00:00Z').getTime();

describe('healthAlertsCron (TASK-137)', () => {
  it('janela de alerta é 7 dias', () => {
    expect(ALERT_WINDOW_DAYS).toBe(7);
  });

  it('recordsDueSoon filtra dentro da janela [now, now+7d]', () => {
    const recs = [
      { next_visit_date: '2026-07-13T10:00:00Z' },   // dentro
      { next_visit_date: '2026-07-19T11:00:00Z' },   // dentro (dia 7)
      { next_visit_date: '2026-07-25T10:00:00Z' },   // fora (futuro)
      { next_visit_date: '2026-07-01T10:00:00Z' },   // fora (passado)
      { next_visit_date: 'not-a-date' },              // inválida
      {},                                             // sem campo
    ];
    expect(recordsDueSoon(recs, NOW)).toHaveLength(2);
  });

  it('alertId é determinístico por (record, uid, dia)', () => {
    expect(alertId('r1', 'u1', '2026-07-13T10:00:00Z')).toBe('health_r1_u1_20260713');
    expect(alertId('r1', 'u1', '2026-07-13T23:00:00Z')).toBe('health_r1_u1_20260713');
  });

  it('cria 1 notification por admin e deduplica ALREADY_EXISTS', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(Object.assign(new Error('already exists'), { code: 6 }));
    const db = { collection: () => ({ doc: () => ({ create }) }) };
    const doc = {
      id: 'rec1',
      ref: { path: 'pets/pet1/medical/rec1' },
      data: () => ({ shelter_club_id: 'club1', next_visit_date: '2026-07-13T10:00:00Z', title: 'Vacina V10' }),
    };
    const result = await processHealthAlerts(
      { db }, [doc], async () => ['admin1', 'admin2'], { error: () => {} },
    );
    expect(result).toEqual({ created: 1, skipped: 1, errors: 0 });
  });

  it('registro sem shelter_club_id é pulado; erro real conta em errors', async () => {
    const db = { collection: () => ({ doc: () => ({ create: vi.fn().mockRejectedValue(new Error('boom')) }) }) };
    const noClub = { id: 'r2', ref: { path: 'pets/p/medical/r2' }, data: () => ({ next_visit_date: '2026-07-13T10:00:00Z' }) };
    const failing = { id: 'r3', ref: { path: 'pets/p/medical/r3' }, data: () => ({ shelter_club_id: 'c', next_visit_date: '2026-07-13T10:00:00Z' }) };
    const result = await processHealthAlerts({ db }, [noClub, failing], async () => ['u1'], { error: () => {} });
    expect(result).toEqual({ created: 0, skipped: 1, errors: 1 });
  });
});
