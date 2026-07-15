/**
 * @fileoverview Testes do CRON de lembrete de evento 24h antes (TASK-337).
 *
 * Cobertura:
 *  1. Flag desabilitada → early return
 *  2. community_events no intervalo → notificação criada
 *  3. club_events via collectionGroup → notificação criada
 *  4. Dedup: mesma event+user no mesmo dia → suprimida (skipped)
 *  5. Evento sem RSVPs → skipped
 *  6. RSVP sem user_id → skipped
 *  7. community_event_rsvps: usa starts_at (não event_date)
 *  8. club_event_rsvps: usa event_id + club_id
 *  9. Feature flag via feature_flags/{name}
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runEventReminder,
  _doTransaction,
  _extractClubId,
  _dedupKey,
  _toDateStr,
  _parseDate,
  NOTIF_TYPE,
} from './eventReminderCronCore.cjs';

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeGetMock(result) {
  return vi.fn(() => Promise.resolve(result));
}

/**
 * Cria chain .where().get()  (para community_event_rsvps: 2 wheres)
 * community_events query: .collection().where().where().get()
 *   → chain: { where: fn, get: fn }
 *   → chain.where().where() → chain_with_2_wheres
 *   → chain_with_2_wheres.get() → result
 *
 * Para community_event_rsvps (2 wheres):
 *   → .collection('x').where().where().get()
 *
 * Para club_event_rsvps (3 wheres):
 *   → .collection('x').where().where().where().get()
 *
 * @param {object} result - valor retornado por .get()
 * @param {number} whereCount - quantos .where() encadeados (default 2)
 */
function makeChainMock(result, whereCount = 2) {
  let current = { get: makeGetMock(result) };
  const whereFn = vi.fn(() => current);
  for (let i = 0; i < whereCount; i++) {
    const prev = current;
    current = { where: whereFn, get: makeGetMock(result) };
    prev.where = whereFn;
  }
  const chain = { where: whereFn, get: makeGetMock(result) };
  return chain;
}

const noopLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// ─── Tests ─────────────────────────────────────────────────────────────

describe('eventReminderCronCore — runEventReminder', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('retorna early quando flag está desabilitada', async () => {
    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: false }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      runTransaction: vi.fn(),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.reason).toBe('flag_disabled');
    expect(noopLogger.info).toHaveBeenCalledWith(expect.stringContaining('flag off'));
  });

  it('retorna zeros quando não há eventos no intervalo', async () => {
    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: true }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      runTransaction: vi.fn(),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('community_events: usa starts_at e community_event_rsvps, notifica RSVP confirmado', async () => {
    const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    const eventId = 'ev-community-1';

    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: true }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        if (name === 'community_events') {
          // community_events: .where().where().get() → 2 wheres
          const commChain = makeChainMock({ empty: false, docs: [{
            id: eventId,
            ref: { path: `community_events/${eventId}` },
            data: () => ({ title: 'Workshop de adoção', starts_at: futureDate, community_id: 'com-1' }),
          }] }, 2);
          commChain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return commChain;
        }
        if (name === 'community_event_rsvps') {
          // community_event_rsvps: .where().where().get() → 2 wheres
          const rsvpChain = makeChainMock({ empty: false, docs: [{
            id: 'rsvp-1',
            data: () => ({ event_id: eventId, user_id: 'u-1', status: 'confirmed' }),
          }] }, 2);
          rsvpChain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return rsvpChain;
        }
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      runTransaction: vi.fn(async (fn) => {
        const t = { get: makeGetMock({ exists: false }), set: vi.fn() };
        return fn(t);
      }),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('club_events: collectionGroup + club_event_rsvps (3 wheres)', async () => {
    const futureDate = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
    const eventId = 'ev-club-1';
    const clubId = 'club-abc';

    // Firestore Admin SDK: db.collectionGroup('events').where().where().get()
    const cgChain = makeChainMock({ empty: false, docs: [{
      id: eventId,
      ref: { path: `clubs/${clubId}/events/${eventId}` },
      data: () => ({ title: 'Mutirão pet', starts_at: futureDate, club_id: clubId }),
    }] }, 2);

    // club_event_rsvps: 3 wheres (event_id, club_id, status)
    const rsvpChain = makeChainMock({ empty: false, docs: [{
      id: 'rsvp-club-1',
      data: () => ({ event_id: eventId, club_id: clubId, user_id: 'u-2', status: 'confirmed' }),
    }] }, 3);

    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: true }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        if (name === 'community_events') {
          return {
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
            get: makeGetMock({ empty: true, docs: [] }),
            doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
          };
        }
        if (name === 'club_event_rsvps') return rsvpChain;
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      collectionGroup: vi.fn(() => cgChain),
      runTransaction: vi.fn(async (fn) => {
        const t = { get: makeGetMock({ exists: false }), set: vi.fn() };
        return fn(t);
      }),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('RSVP com user_id null → skipped', async () => {
    const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    const eventId = 'ev-null-uid';

    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: true }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        if (name === 'community_events') {
          const chain = makeChainMock({ empty: false, docs: [{
            id: eventId,
            ref: { path: `community_events/${eventId}` },
            data: () => ({ title: 'E', starts_at: futureDate, community_id: 'c-1' }),
          }] }, 2);
          chain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return chain;
        }
        if (name === 'community_event_rsvps') {
          const chain = makeChainMock({ empty: false, docs: [{
            id: 'rsvp-null',
            data: () => ({ event_id: eventId, user_id: null, status: 'confirmed' }),
          }] }, 2);
          chain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return chain;
        }
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      runTransaction: vi.fn(),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.errors).toBe(0);
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  it('transação rejeitada → errors++', async () => {
    const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
    const eventId = 'ev-tx-err';

    const db = {
      collection: vi.fn((name) => {
        if (name === 'feature_flags') {
          return {
            doc: vi.fn(() => ({ get: makeGetMock({ exists: true, data: () => ({ enabled: true }) }) })),
            get: makeGetMock({ empty: true, docs: [] }),
            where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          };
        }
        if (name === 'community_events') {
          const chain = makeChainMock({ empty: false, docs: [{
            id: eventId,
            ref: { path: `community_events/${eventId}` },
            data: () => ({ title: 'E', starts_at: futureDate, community_id: 'c-1' }),
          }] }, 2);
          chain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return chain;
        }
        if (name === 'community_event_rsvps') {
          const chain = makeChainMock({ empty: false, docs: [{
            id: 'rsvp-1',
            data: () => ({ event_id: eventId, user_id: 'u-1', status: 'confirmed' }),
          }] }, 2);
          chain.doc = vi.fn(() => ({ get: makeGetMock({ exists: false }) }));
          return chain;
        }
        return {
          where: vi.fn(() => ({ where: vi.fn(() => ({ get: makeGetMock({ empty: true, docs: [] }) })) })),
          get: makeGetMock({ empty: true, docs: [] }),
          doc: vi.fn(() => ({ get: makeGetMock({ exists: false }) })),
        };
      }),
      runTransaction: vi.fn().mockRejectedValue(new Error('Firestore unavailable')),
    };

    const result = await runEventReminder({ db, logger: noopLogger });

    expect(result.errors).toBe(1);
    expect(noopLogger.error).toHaveBeenCalledWith(expect.stringContaining('failed fan-out'), expect.any(Object));
  });
});

describe('eventReminderCronCore — _doTransaction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('retorna true e seta dedup + notif quando dedup key não existe', async () => {
    const db = {
      collection: vi.fn((name) => ({ doc: vi.fn(() => ({ set: vi.fn() })) })),
      runTransaction: vi.fn(),
    };

    const t = { get: makeGetMock({ exists: false }), set: vi.fn() };
    const result = await _doTransaction(t, db, 'dedup-key-1', 'uid-1', NOTIF_TYPE,
      'Lembrete!', 'Evento amanhã', '/eventos/ev-1', 'ev-1', '2026-07-15T10:00:00Z', 1752573600000);

    expect(result).toBe(true);
    // 2 sets: dedup doc + notification doc
    expect(t.set).toHaveBeenCalledTimes(2);
  });

  it('retorna false quando dedup key já existe (suppress)', async () => {
    const db = {
      collection: vi.fn(() => ({ doc: vi.fn(() => ({ set: vi.fn() })) })),
      runTransaction: vi.fn(),
    };

    const t = { get: makeGetMock({ exists: true }), set: vi.fn() };
    const result = await _doTransaction(t, db, 'dedup-key-1', 'uid-1', NOTIF_TYPE,
      'T', 'M', '/l', 'ev-1', '2026-07-15T10:00:00Z', 1752573600000);

    expect(result).toBe(false);
    expect(t.set).not.toHaveBeenCalled();
  });
});

describe('eventReminderCronCore — helpers', () => {
  it('extractClubId extrai clubId do path clubs/{clubId}/events/{eventId}', () => {
    expect(_extractClubId('clubs/abc123/events/ev-1')).toBe('abc123');
    expect(_extractClubId('clubs/my-club/events/my-event')).toBe('my-club');
    expect(_extractClubId('community_events/ev-1')).toBe('');
    expect(_extractClubId('clubs/club-xyz/events/evt')).toBe('club-xyz');
  });

  it('dedupId é determinístico', () => {
    const id1 = _dedupKey('event_reminder', 'ev-1', 'u-1', '2026-07-16');
    const id2 = _dedupKey('event_reminder', 'ev-1', 'u-1', '2026-07-16');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^event_reminder:[a-f0-9]{24}$/);
  });

  it('dedupId único para eventos diferentes', () => {
    const id1 = _dedupKey('event_reminder', 'ev-1', 'u-1', '2026-07-16');
    const id2 = _dedupKey('event_reminder', 'ev-2', 'u-1', '2026-07-16');
    expect(id1).not.toBe(id2);
  });

  it('toDateStr formata YYYY-MM-DD', () => {
    expect(_toDateStr(new Date('2026-07-15T14:30:00Z'))).toBe('2026-07-15');
    expect(_toDateStr('2026-12-31')).toBe('2026-12-31');
    expect(_toDateStr(null)).toBe('');
    expect(_toDateStr('')).toBe('');
  });

  it('parseDate: null/invalid → null', () => {
    expect(_parseDate(null)).toBeNull();
    expect(_parseDate('invalid')).toBeNull();
    expect(_parseDate('')).toBeNull();
  });

  it('parseDate: string ISO → Date', () => {
    const result = _parseDate('2026-07-15T14:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-07-15T14:00:00.000Z');
  });

  it('parseDate: Timestamp com toDate()', () => {
    const ts = { toDate: () => new Date('2026-07-15T10:00:00Z') };
    const result = _parseDate(ts);
    expect(result.toISOString()).toBe('2026-07-15T10:00:00.000Z');
  });
});
