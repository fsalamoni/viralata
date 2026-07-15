/**
 * @fileoverview Tests para volunteerHoursCronCore.js
 *
 * Mocking simplificado: usa um objeto fake com stubs directos,
 * injetado via _setOverrides(). Sem vi.fn() para os stubs.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// ─── Stubs directos (não são spies) ──────────────────────────────────────

// Spies só para calls que precisamos verificar
const spyDocGet = vi.fn();
const spyDedupGet = vi.fn();
const spyDedupSet = vi.fn();
const spyNotifAdd = vi.fn();
const spyUserDocGet = vi.fn();
const spyLogInfo = vi.fn();
const spyLogError = vi.fn();

// Plain functions sem vi.fn()
function makeChain(result) {
  return {
    where: () => makeChain(result),
    limit: () => makeChain(result),
    get: () => result,
  };
}

function makeDocSpy() {
  return {
    set: vi.fn(),
    get: spyDocGet,
  };
}

function makeDedupDoc() {
  return {
    set: spyDedupSet,
    get: spyDedupGet,
  };
}

function makeNotifRef() {
  return { add: spyNotifAdd };
}

function makeUserDoc() {
  return { get: spyUserDocGet };
}

// Mock db que é sempre o mesmo objeto (referência estável)
let mockDb;

function initMockDb() {
  const db = {
    batch: vi.fn(),
    // Plain functions (não vi.fn wrapping) para evitar problemas de mock
    collectionGroup: (name) => makeChain(),
    collection: (name) => {
      if (name === 'feature_flags') return { doc: () => makeDocSpy() };
      if (name === 'notification_dedup') return { doc: () => makeDedupDoc() };
      if (name === 'notifications') return makeNotifRef();
      if (name === 'users') return { doc: () => makeUserDoc() };
      return makeChain();
    },
  };
  mockDb = db;
}

let logger;
let core;
let FLAG;

beforeAll(async () => {
  initMockDb();
  core = await import('./volunteerHoursCronCore.js');
  core._setOverrides({ db: mockDb });
  FLAG = core.FEATURE_FLAG_HOURS;
  logger = { info: spyLogInfo, error: spyLogError, warn: vi.fn() };
});

beforeEach(() => {
  // Reset spy call history + queues
  spyDocGet.mockReset();
  spyDedupGet.mockReset();
  spyDedupSet.mockReset();
  spyNotifAdd.mockReset();
  spyUserDocGet.mockReset();
  spyLogInfo.mockReset();
  spyLogError.mockReset();
  core._resetOverrides();
  // Recreate mockDb (referência atualizada para o módulo)
  initMockDb();
  core._setOverrides({ db: mockDb });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setupFlag(enabled) {
  spyDocGet.mockResolvedValueOnce({
    exists: true,
    data: () => ({ [FLAG]: enabled }),
  });
}

// ─── Unit helpers ─────────────────────────────────────────────────────────

describe('_hoursFromCheck', () => {
  it('calcula horas corretamente', () => {
    expect(core._hoursFromCheck(
      new Date('2026-07-15T09:00:00Z'),
      new Date('2026-07-15T12:30:00Z'),
    )).toBe(3.5);
  });

  it('retorna 0 se falta check_in', () => {
    expect(core._hoursFromCheck(null, new Date())).toBe(0);
    expect(core._hoursFromCheck(undefined, new Date())).toBe(0);
  });

  it('retorna 0 se falta check_out', () => {
    expect(core._hoursFromCheck(new Date(), null)).toBe(0);
    expect(core._hoursFromCheck(new Date(), undefined)).toBe(0);
  });

  it('retorna 0 se check_out <= check_in', () => {
    const t = new Date('2026-07-15T09:00:00Z');
    expect(core._hoursFromCheck(t, t)).toBe(0);
  });

  it('aceita strings ISO', () => {
    expect(core._hoursFromCheck('2026-07-15T09:00:00Z', '2026-07-15T14:00:00Z')).toBe(5);
  });
});

describe('_toDateStr', () => {
  it('formata YYYY-MM-DD', () => {
    expect(core._toDateStr(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15');
  });

  it('zero-pads mês e dia', () => {
    expect(core._toDateStr(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });

  it('retorna string vazia para null/inválido', () => {
    expect(core._toDateStr(null)).toBe('');
    expect(core._toDateStr('not-a-date')).toBe('');
  });
});

describe('_isToday', () => {
  it('retorna true para a data de hoje', () => {
    expect(core._isToday(new Date())).toBe(true);
  });

  it('retorna false para ontem', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(core._isToday(d)).toBe(false);
  });

  it('retorna false para amanhã', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    expect(core._isToday(d)).toBe(false);
  });
});

// ─── runAggregateVolunteerHours ───────────────────────────────────────────

describe('runAggregateVolunteerHours', () => {
  it('retorna skipped quando flag desativada', async () => {
    setupFlag(false);
    const result = await core.runAggregateVolunteerHours({ db: mockDb, logger });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('flag_disabled');
  });

  it('retorna 0 se não há perfis', async () => {
    setupFlag(true);
    // Sobrescreve collectionGroup para retornar empty
    mockDb.collectionGroup = () => ({
      where: () => ({ limit: () => ({ get: () => ({ empty: true, docs: [] }) }) }),
    });

    const result = await core.runAggregateVolunteerHours({ db: mockDb, logger });
    expect(result.processed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(false);
  });

  it('agrega horas e atualiza perfil', async () => {
    // Flag enabled — spyDocGet precisa retornar { exists: true, data: { [FLAG]: true } }
    spyDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ [FLAG]: true }) });
    const uid = 'uid1';
    const now = new Date();
    const td = today();

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const profileRef = {
      ref: {
        path: `users/${uid}/volunteer_profile/main`,
        update: mockUpdate,
      },
    };

    const testDb = {
      batch: vi.fn(),
      collectionGroup: (name) => {
        if (name === 'volunteer_profile') {
          return {
            where: () => ({
              limit: () => ({
                get: () => ({ empty: false, docs: [profileRef] }),
              }),
            }),
          };
        }
        if (name === 'volunteer_participations') {
          return {
            where: () => ({
              where: () => ({
                get: () => ({
                  empty: false,
                  docs: [{
                    ref: { path: `clubs/c1/volunteer_participations/p1` },
                    data: () => ({
                      volunteer_uid: uid,
                      event_date: td,
                      check_in: new Date(now - 2 * 3600000),
                      check_out: now,
                      status: 'completed',
                    }),
                  }],
                }),
              }),
            }),
          };
        }
        return {
          where: () => ({ limit: () => ({ get: () => ({ empty: true, docs: [] }) }) }),
        };
      },
      collection: (name) => {
        if (name === 'feature_flags') {
          return {
            doc: () => ({
              get: () => ({ exists: true, data: () => ({ [FLAG]: true }) }),
            }),
          };
        }
        return { where: () => ({ limit: () => ({ get: () => ({ empty: true, docs: [] }) }) }) };
      },
    };

    const result = await core.runAggregateVolunteerHours({ db: testDb, logger });
    expect(result.skipped).toBe(false);
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('não quebra se update falha (conta erro)', async () => {
    setupFlag(true);
    const uid = 'uid1';
    const mockUpdate = vi.fn().mockRejectedValue(new Error('boom'));

    mockDb.collectionGroup = (name) => {
      if (name === 'volunteer_profile') {
        return {
          where: () => ({
            limit: () => ({
              get: () => ({
                empty: false,
                docs: [{
                  ref: { path: `users/${uid}/volunteer_profile/main` },
                  update: mockUpdate,
                }],
              }),
            }),
          }),
        };
      }
      return { where: () => ({ limit: () => ({ get: () => ({ empty: true, docs: [] }) }) }) };
    };

    const result = await core.runAggregateVolunteerHours({ db: mockDb, logger });
    expect(result.errors).toBe(1);
    expect(result.processed).toBe(0);
  });
});

// ─── runSendShiftReminders ────────────────────────────────────────────────

describe('runSendShiftReminders', () => {
  it('retorna skipped quando flag desativada', async () => {
    setupFlag(false);
    const result = await core.runSendShiftReminders({ db: mockDb, logger });
    expect(result.skipped).toBe(true);
  });

  it('pulsa participações sem voluntário', async () => {
    setupFlag(true);
    spyDedupGet.mockResolvedValueOnce({ exists: false });
    spyNotifAdd.mockResolvedValueOnce({ id: 'n1' });
    spyUserDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ fcm_tokens: [], email: null }),
    });

    mockDb.collectionGroup = () => ({
      where: () => ({
        where: () => ({
          get: () => ({
            empty: false,
            docs: [{
              id: 'p1',
              ref: { path: 'clubs/c1/volunteer_participations/p1' },
              data: () => ({
                volunteer_uid: null,
                event_date: today(),
                status: 'scheduled',
                event_label: 'Passeio',
              }),
            }],
          }),
        }),
      }),
    });

    const result = await core.runSendShiftReminders({ db: mockDb, logger });
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
  });

  it('suprime se dedup já existe', async () => {
    setupFlag(true);
    spyDedupGet.mockResolvedValueOnce({ exists: true }); // dedup hit

    mockDb.collectionGroup = () => ({
      where: () => ({
        where: () => ({
          get: () => ({
            empty: false,
            docs: [{
              id: 'p1',
              ref: { path: 'clubs/c1/volunteer_participations/p1' },
              data: () => ({
                volunteer_uid: 'uid1',
                event_date: today(),
                status: 'scheduled',
                event_label: 'Passeio',
              }),
            }],
          }),
        }),
      }),
    });

    const result = await core.runSendShiftReminders({ db: mockDb, logger });
    expect(result.skipped).toBe(1);
    expect(result.sent).toBe(0);
    expect(spyNotifAdd).not.toHaveBeenCalled();
  });

  it('cria notificação + dedup quando novo', async () => {
    setupFlag(true);
    spyDedupGet.mockResolvedValueOnce({ exists: false });
    spyNotifAdd.mockResolvedValueOnce({ id: 'n-new' });
    spyDedupSet.mockResolvedValueOnce(undefined);
    spyUserDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ fcm_tokens: [], email: 'vol@test.com' }),
    });

    mockDb.collectionGroup = () => ({
      where: () => ({
        where: () => ({
          get: () => ({
            empty: false,
            docs: [{
              id: 'p1',
              ref: { path: 'clubs/c1/volunteer_participations/p1' },
              data: () => ({
                volunteer_uid: 'uid1',
                event_date: today(),
                status: 'scheduled',
                event_label: 'Passeio',
                scheduled_time: '09:00',
              }),
            }],
          }),
        }),
      }),
    });

    // Mock volunteerEmails
    const origRequire = module.constructor.prototype.require;
    module.constructor.prototype.require = function(mod) {
      if (mod.endsWith('volunteerEmails')) {
        return { sendShiftReminderEmail: vi.fn().mockResolvedValue({ ok: true }) };
      }
      return origRequire.call(this, mod);
    };

    try {
      const result = await core.runSendShiftReminders({ db: mockDb, logger });
      expect(result.sent).toBe(1);
      expect(spyDedupSet).toHaveBeenCalled();
      expect(spyNotifAdd).toHaveBeenCalled();
      const notifPayload = spyNotifAdd.mock.calls[0][0];
      expect(notifPayload.user_id).toBe('uid1');
      expect(notifPayload.type).toBe('shift_reminder');
    } finally {
      module.constructor.prototype.require = origRequire;
    }
  });

  it('conta erro sem quebrar o loop', async () => {
    setupFlag(true);
    spyDedupGet.mockRejectedValueOnce(new Error('boom'));

    mockDb.collectionGroup = () => ({
      where: () => ({
        where: () => ({
          get: () => ({
            empty: false,
            docs: [{
              id: 'p1',
              ref: { path: 'clubs/c1/volunteer_participations/p1' },
              data: () => ({
                volunteer_uid: 'uid1',
                event_date: today(),
                status: 'scheduled',
                event_label: 'Passeio',
              }),
            }],
          }),
        }),
      }),
    });

    const result = await core.runSendShiftReminders({ db: mockDb, logger });
    expect(result.errors).toBe(1);
    expect(result.sent).toBe(0);
  });
});
