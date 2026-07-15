/**
 * @fileoverview Testes para volunteerPrivacyCore.js (TASK-272).
 *
 * Estratégia: testar a lógica de negócio SEM dependência de Firestore.
 * Para isso, o módulo é carregado uma vez (antesAll), e cada teste
 * injeta um targetDb mockado que simula o comportamento desejado.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

let mod;

const NOOP_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };

// ─── Setup: mocks (vi.mock roda ANTES do import()) ────────────────────────────

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  default: { initializeApp: vi.fn(), getApps: vi.fn(() => []) },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: () => ({ doc: () => ({}) }) }),
  FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  default: {
    getFirestore: () => ({ collection: () => ({ doc: () => ({}) }) }),
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  },
}));

beforeAll(async () => {
  mod = await import('./volunteerPrivacyCore.js');
});

// ─── makePseudonymUid ─────────────────────────────────────────────────────────

describe('makePseudonymUid', () => {
  it('determinístico: mesmo uid → mesmo pseudonym', () => {
    expect(mod.makePseudonymUid('abc123def456')).toBe(mod.makePseudonymUid('abc123def456'));
  });

  it('uids diferentes → pseudonyms diferentes', () => {
    expect(mod.makePseudonymUid('uid1')).not.toBe(mod.makePseudonymUid('uid2'));
  });

  it('formato: pseudonym_ + 16 hex chars', () => {
    expect(mod.makePseudonymUid('testuid')).toMatch(/^pseudonym_[0-9a-f]{16}$/);
  });
});

// ─── anonymizedName ───────────────────────────────────────────────────────────

describe('anonymizedName', () => {
  it('inclui prefixo fixo', () => {
    expect(mod.anonymizedName('uid123456')).toMatch(/^Voluntário #/);
  });

  it('shortId = primeiros 6 chars do uid', () => {
    expect(mod.anonymizedName('uid123456')).toBe('Voluntário #uid123');
  });

  it('fallback quando uid undefined', () => {
    expect(mod.anonymizedName(undefined)).toBe('Voluntário #XXXXXX');
  });
});

// ─── runSoftDeleteVolunteer ───────────────────────────────────────────────────

/**
 * Cria um targetDb mockado com comportamento configurável.
 * @param {object} opts
 * @param {boolean} opts.rosterExists
 * @param {object|null} opts.rosterData
 */
function mockDb({ rosterExists = false, rosterData = {} } = {}) {
  const rosterRef = { path: 'clubs/club1/volunteers/vol1' };
  const profileRef = { path: 'users/vol1/volunteer_profile/main' };
  const rosterSnap = { exists: rosterExists, data: () => rosterData };
  const profileSnap = { exists: false, data: () => ({}) };

  function makeRef(p) {
    return {
      path: p,
      get: async () => ({ exists: () => false }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      collection: (s) => makeRef(`${p}/${s}`),
    };
  }

  return {
    collection: (name) => {
      const col = {
        doc: (id) => {
          const ref = makeRef(`${name}/${id}`);
          return ref;
        },
        where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }),
      };
      return col;
    },
    collectionGroup: () => ({
      where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }),
    }),
    doc: (path) => makeRef(path),
    runTransaction: async (fn) => {
      // Use the actual snap objects, not vi.fn() — vi.fn() gets reset between tests
      const tx = {
        get: async (ref) => {
          if (ref.path === rosterRef.path) return rosterSnap;
          if (ref.path === profileRef.path) return profileSnap;
          return { exists: false };
        },
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      const result = await fn(tx);
      // Attach tx to result for test inspection
      result._tx = tx;
      return result;
    },
  };
}

describe('runSoftDeleteVolunteer', () => {
  it('lança erro se clubId ausente', async () => {
    await expect(mod.runSoftDeleteVolunteer({ clubId: '', volunteerUid: 'v1' }))
      .rejects.toThrow('clubId e volunteerUid são obrigatórios');
  });

  it('lança erro se volunteerUid ausente', async () => {
    await expect(mod.runSoftDeleteVolunteer({ clubId: 'c1', volunteerUid: '' }))
      .rejects.toThrow('clubId e volunteerUid são obrigatórios');
  });

  it('retorna ok + pseudonymUid quando roster doc não existe', async () => {
    const db = mockDb({ rosterExists: false });
    const result = await mod.runSoftDeleteVolunteer({
      clubId: 'club1', volunteerUid: 'vol1', actorUid: 'admin1',
      targetDb: db, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true);
    expect(result.pseudonymUid).toMatch(/^pseudonym_[0-9a-f]{16}$/);
    expect(result.counts.roster).toBe(0); // doc não existia
    expect(result.counts.profile).toBe(0);
  });

  it('anonymiza campos PII quando roster doc existe', async () => {
    // Build a fully-controlled mock with captured tx for verification
    const updateMock = vi.fn();
    const rosterSnap = { exists: true, data: () => ({ volunteer_uid: 'vol1', status: 'active' }) };
    const profileSnap = { exists: false, data: () => ({}) };

    const capturedTx = {};
    const db = {
      collection: (name) => ({
        doc: (id) => ({
          path: `${name}/${id}`,
          collection: (s) => ({ doc: (x) => ({ path: `${name}/${id}/${s}/${x}` }) }),
        }),
      }),
      collectionGroup: () => ({ where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }) }),
      doc: (path) => ({ path, collection: (s) => ({ doc: (x) => ({ path: `${path}/${s}/${x}` }) }) }),
      runTransaction: async (fn) => {
        const tx = {
          get: async (ref) => {
            if (ref.path.includes('volunteers')) return rosterSnap;
            if (ref.path.includes('volunteer_profile')) return profileSnap;
            return { exists: false };
          },
          update: updateMock,
          set: vi.fn(),
          delete: vi.fn(),
        };
        Object.assign(capturedTx, tx);
        return fn(tx);
      },
    };

    const result = await mod.runSoftDeleteVolunteer({
      clubId: 'club1', volunteerUid: 'vol1', actorUid: 'admin1',
      targetDb: db, logger: NOOP_LOGGER,
    });

    expect(result.ok).toBe(true);
    expect(result.counts.roster).toBe(1); // snap.exists=true → rosterOk=true
    expect(updateMock).toHaveBeenCalled();
    const [, updateData] = updateMock.mock.calls[0];
    expect(updateData.volunteer_name).toBe('Voluntário #vol1');
    expect(updateData.volunteer_email).toBe(null);
    expect(updateData.status).toBe('left');
    expect(updateData.left_reason).toBe('lgpd_deletion');
    expect(updateData.pseudonym_uid).toBe(result.pseudonymUid);
  });

  it('non-blocking: não lança se transaction falha', async () => {
    const failingDb = {
      collection: () => ({ doc: () => ({ get: async () => { throw new Error('boom'); } }) }),
      collectionGroup: () => ({ where: () => ({ get: async () => { throw new Error('boom'); } }) }),
      doc: () => ({ get: async () => { throw new Error('boom'); } }),
      runTransaction: async () => { throw new Error('boom'); },
    };
    const result = await mod.runSoftDeleteVolunteer({
      clubId: 'club1', volunteerUid: 'vol1', actorUid: 'admin1',
      targetDb: failingDb, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true); // não lança
  });
});

// ─── runEraseMyVolunteerData ─────────────────────────────────────────────────

function mockDbErase({ profileExists = false, profileData = {} } = {}) {
  const profileRef = { path: 'users/vol1/volunteer_profile/main' };
  const profileSnap = { exists: profileExists, data: () => profileData };

  function makeRef(p) {
    return {
      path: p,
      get: async () => ({ exists: () => false }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      collection: (s) => makeRef(`${p}/${s}`),
    };
  }

  return {
    collection: (name) => ({
      doc: (id) => {
        const ref = makeRef(`${name}/${id}`);
        return ref;
      },
      where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }),
    }),
    collectionGroup: () => ({
      where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }),
    }),
    doc: (path) => makeRef(path),
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref.path === profileRef.path) return profileSnap;
          return { exists: false };
        },
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      return fn(tx);
    },
  };
}

describe('runEraseMyVolunteerData', () => {
  it('lança erro se uid ausente', async () => {
    await expect(mod.runEraseMyVolunteerData({ uid: '', actorUid: 'u1' }))
      .rejects.toThrow('uid é obrigatório.');
  });

  it('retorna ok + counts (doc inexistente)', async () => {
    const db = mockDbErase({ profileExists: false });
    const result = await mod.runEraseMyVolunteerData({
      uid: 'vol1', actorUid: 'vol1',
      targetDb: db, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true);
    expect(result.counts.profile).toBe(0);
    expect(result.counts.roster).toBe(0);
  });

  it('preserva campos de aceite legal quando profile existe', async () => {
    const setMock = vi.fn();
    const profileSnap = {
      exists: true,
      data: () => ({
        terms_accepted_at: '2025-01-01T00:00:00Z',
        terms_version: 'v2.0',
        terms_type: 'volunteer',
        terms_ip: '1.2.3.4',
        terms_user_agent: 'Mozilla/5.0',
        terms_hash: 'abc123',
        full_name: 'João Silva',
        notes: 'secret',
      }),
    };
    const db = {
      collection: (name) => ({
        doc: (id) => ({
          path: `${name}/${id}`,
          collection: (s) => ({ doc: (x) => ({ path: `${name}/${id}/${s}/${x}` }) }),
        }),
      }),
      collectionGroup: () => ({ where: () => ({ get: async () => ({ empty: true, docs: [], size: 0 }) }) }),
      doc: (path) => ({ path, collection: (s) => ({ doc: (x) => ({ path: `${path}/${s}/${x}` }) }) }),
      runTransaction: async (fn) => {
        const tx = {
          get: async (ref) => {
            if (ref.path.includes('volunteer_profile')) return profileSnap;
            return { exists: false };
          },
          update: vi.fn(),
          set: setMock,
          delete: vi.fn(),
        };
        return fn(tx);
      },
    };

    await mod.runEraseMyVolunteerData({
      uid: 'vol1', actorUid: 'vol1',
      targetDb: db, logger: NOOP_LOGGER,
    });

    expect(setMock).toHaveBeenCalled();
    const [, setData] = setMock.mock.calls[0];

    // Campos de aceite PRESERVADOS (Lei 14.063/2020)
    expect(setData.terms_accepted_at).toBe('2025-01-01T00:00:00Z');
    expect(setData.terms_version).toBe('v2.0');
    expect(setData.terms_ip).toBe('1.2.3.4');
    expect(setData.terms_user_agent).toBe('Mozilla/5.0');
    expect(setData.terms_hash).toBe('abc123');
    // PII removido
    expect(setData.full_name).toBeUndefined();
    expect(setData.notes).toBeUndefined();
    expect(setData.erased_at).toBeDefined();
    expect(setData.erased_by).toBe('vol1');
  });

  it('non-blocking: não lança se cascade falha', async () => {
    const failingDb = {
      collection: () => ({ doc: () => ({ get: async () => { throw new Error('boom'); } }) }),
      collectionGroup: () => ({ where: () => ({ get: async () => { throw new Error('boom'); } }) }),
      doc: () => ({ get: async () => { throw new Error('boom'); } }),
      runTransaction: async () => { throw new Error('boom'); },
    };
    const result = await mod.runEraseMyVolunteerData({
      uid: 'vol1', actorUid: 'vol1',
      targetDb: failingDb, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true);
  });
});

// ─── runHardDeleteVolunteerDocument ───────────────────────────────────────────

function mockDbHardDelete() {
  const calls = { delete: [], update: [], set: [] };
  function plainFn(...args) { calls._.push(args); }
  function makeRef(p) {
    return {
      path: p,
      get: async () => ({ exists: true, data: () => ({}) }),
      update: (...args) => calls.update.push(args),
      set: (...args) => calls.set.push(args),
      delete: (...args) => calls.delete.push(args),
      collection: (s) => makeRef(`${p}/${s}`),
    };
  }

  return {
    collection: (name) => ({
      doc: (id) => makeRef(`${name}/${id}`),
    }),
    doc: (path) => makeRef(path),
    runTransaction: async (fn) => {
      const tx = {
        get: async () => ({ exists: true, data: () => ({}) }),
        update: (...args) => calls.update.push(args),
        set: (...args) => calls.set.push(args),
        delete: (...args) => calls.delete.push(args),
      };
      return fn(tx);
    },
    _calls: calls,
  };
}

describe('runHardDeleteVolunteerDocument', () => {
  it('lança erro se clubId ausente', async () => {
    await expect(mod.runHardDeleteVolunteerDocument({
      clubId: '', collectionPath: 'volunteer_documents', docId: 'd1',
      actorUid: 'admin1',
    })).rejects.toThrow('clubId, collectionPath e docId são obrigatórios');
  });

  it('lança erro se coleção não permitida', async () => {
    await expect(mod.runHardDeleteVolunteerDocument({
      clubId: 'c1', collectionPath: 'BAD_COLLECTION', docId: 'd1',
      actorUid: 'admin1',
    })).rejects.toThrow('Coleção não permitida');
  });

  // Integration test using a plain mock (no vi.fn in the chain)
  it('permite volunteer_documents e deleta o doc', async () => {
    const calls = { delete: [] };
    // Plain mock — no vi.fn() in chain methods to avoid quirk
    function mkRef(p) {
      const ref = Object.create(null);
      ref.path = p;
      ref.get = async () => ({ exists: true, data: () => ({}) });
      ref.delete = (...a) => calls.delete.push(a);
      ref.update = () => {};
      ref.set = () => {};
      ref.collection = (s) => mkRef(`${p}/${s}`);
      ref.doc = (x) => mkRef(`${p}/${x}`);
      return ref;
    }
    const db = Object.create(null);
    db.collection = (n) => ({ doc: (id) => mkRef(`${n}/${id}`) });
    db.doc = (p) => mkRef(p);
    db.runTransaction = async (fn) => {
      const tx = Object.create(null);
      tx.get = async () => ({ exists: true, data: () => ({}) });
      tx.delete = (...a) => calls.delete.push(a);
      tx.update = () => {};
      tx.set = () => {};
      return fn(tx);
    };

    const result = await mod.runHardDeleteVolunteerDocument({
      clubId: 'c1', collectionPath: 'volunteer_documents', docId: 'd1',
      actorUid: 'admin1', targetDb: db, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true);
    expect(calls.delete.length).toBeGreaterThan(0);
  });

  it('permite volunteer_background_checks e deleta o doc', async () => {
    const calls = { delete: [] };
    function mkRef(p) {
      const ref = Object.create(null);
      ref.path = p;
      ref.get = async () => ({ exists: true, data: () => ({}) });
      ref.delete = (...a) => calls.delete.push(a);
      ref.update = () => {};
      ref.set = () => {};
      ref.collection = (s) => mkRef(`${p}/${s}`);
      ref.doc = (x) => mkRef(`${p}/${x}`);
      return ref;
    }
    const db = Object.create(null);
    db.collection = (n) => ({ doc: (id) => mkRef(`${n}/${id}`) });
    db.doc = (p) => mkRef(p);
    db.runTransaction = async (fn) => {
      const tx = Object.create(null);
      tx.get = async () => ({ exists: true, data: () => ({}) });
      tx.delete = (...a) => calls.delete.push(a);
      tx.update = () => {};
      tx.set = () => {};
      return fn(tx);
    };

    const result = await mod.runHardDeleteVolunteerDocument({
      clubId: 'c1', collectionPath: 'volunteer_background_checks', docId: 'bg1',
      actorUid: 'admin1', targetDb: db, logger: NOOP_LOGGER,
    });
    expect(result.ok).toBe(true);
    expect(calls.delete.length).toBeGreaterThan(0);
  });
});
