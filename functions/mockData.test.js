/**
 * Testes do `functions/mockDataCore.js` (TASK-400 fix 2026-07-12).
 *
 * Foca na lógica pura: deepReplace (placeholders), materializeData,
 * resolveDocRef (raiz vs subcoleção). Sem dependência de
 * `firebase-functions` nem `firebase-admin` — pode rodar em CI mesmo
 * sem os pacotes instalados.
 *
 * As funções callable (loadMockData, clearMockData, getMockStatus)
 * dependem de firebase-admin/onCall — cobertas por testes e2e/smoke
 * com o emulador do Firestore em outro lugar. O gate `assertOwner`
 * é trivial (4 linhas) e vive em `mockData.js`; revisado em code
 * review sempre que o arquivo é tocado.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { deepReplace, materializeData, resolveDocRef } = require('./mockDataCore');

/* ============================================================== *
 * 1. deepReplace                                                  *
 * ============================================================== */

describe('mockData · deepReplace', () => {
  const UID = 'real-uid-123';
  const NAME = 'Fulano da Silva';

  it('substitui string em valor escalar', () => {
    expect(deepReplace('REAL_USER_UID', UID, NAME)).toBe(UID);
    expect(deepReplace('REAL_USER_NAME', UID, NAME)).toBe(NAME);
  });

  it('substitui recursivamente em objetos aninhados', () => {
    const input = {
      user_id: 'REAL_USER_UID',
      nested: {
        display: 'REAL_USER_NAME',
        flag: true,
      },
    };
    expect(deepReplace(input, UID, NAME)).toEqual({
      user_id: UID,
      nested: { display: NAME, flag: true },
    });
  });

  it('substitui em arrays', () => {
    expect(deepReplace(['REAL_USER_UID', 'a', 'b'], UID, NAME))
      .toEqual([UID, 'a', 'b']);
  });

  it('preserva valores não-placeholder', () => {
    expect(deepReplace(42, UID, NAME)).toBe(42);
    expect(deepReplace(null, UID, NAME)).toBe(null);
    expect(deepReplace(undefined, UID, NAME)).toBe(undefined);
  });

  it('não muta o input', () => {
    const input = { a: 'REAL_USER_UID' };
    const out = deepReplace(input, UID, NAME);
    expect(input).toEqual({ a: 'REAL_USER_UID' });
    expect(out).toEqual({ a: UID });
  });
});

/* ============================================================== *
 * 2. materializeData                                              *
 * ============================================================== */

describe('mockData · materializeData', () => {
  it('retorna o data inalterado se realUid for vazio', () => {
    const data = { user_id: 'REAL_USER_UID' };
    expect(materializeData(data, null, 'Nome')).toEqual({ user_id: 'REAL_USER_UID' });
  });

  it('substitui o placeholder quando realUid é fornecido', () => {
    const data = { user_id: 'REAL_USER_UID', name: 'REAL_USER_NAME' };
    expect(materializeData(data, 'abc', 'Ciclano')).toEqual({
      user_id: 'abc',
      name: 'Ciclano',
    });
  });
});

/* ============================================================== *
 * 3. resolveDocRef                                                *
 * ============================================================== */

describe('mockData · resolveDocRef', () => {
  function makeFakeDb() {
    return {
      collection: (name) => {
        const collectionChain = {
          doc: (id) => ({ kind: 'top', name, id, _ref: `${name}/${id}` }),
          // encadeamento para subcoleção — db.collection(p).doc(pid).collection(c).doc(cid)
          // Implementação parcial aqui; o caminho completo é exercitado em
          // e2e com emulador.
        };
        return collectionChain;
      },
    };
  }

  it('resolve para raiz (sem parent)', () => {
    const db = makeFakeDb();
    const ref = resolveDocRef(db, 'users', 'u1', undefined, undefined);
    expect(ref._ref).toBe('users/u1');
  });

  it('encadeia collection→doc para o caminho de subcoleção', () => {
    // Valida que o helper aceita (parent, parentId) sem explodir; o
    // encadeamento profundo é delegado ao `db` real (testado em e2e).
    const db = {
      collection: (name) => ({
        doc: (id) => ({
          collection: (cname) => ({
            doc: (cid) => ({ _ref: `${name}/${id}/${cname}/${cid}` }),
          }),
        }),
      }),
    };
    const ref = resolveDocRef(db, 'messages', 'm1', 'conversations', 'cnv_001');
    expect(ref._ref).toBe('conversations/cnv_001/messages/m1');
  });
});

/* ============================================================== *
 * 4. Dynamic import do pacote de mocks (cobre o caminho crítico) *
 * ============================================================== *
 *
 * Garante que o `loadMockPayloads()` consegue puxar o pacote de
 * mocks (que é ESM) a partir do `mockData.js` (CJS) via
 * `await import()`. Sem isso, a Cloud Function quebra em runtime
 * porque não encontra o módulo.
 */

describe('mockData · dynamic import do pacote src/mocks/', () => {
  it('carrega o índice de payloads via pathToFileURL (replica do loadMockPayloads)', async () => {
    const { pathToFileURL } = await import('node:url');
    const indexUrl = pathToFileURL(
      path.resolve(__dirname, '..', 'src', 'mocks', 'index.js')
    ).href;
    const m = await import(indexUrl);
    expect(Array.isArray(m.mockPayloads)).toBe(true);
    expect(m.mockPayloads.length).toBe(28);
    expect(m.MOCK_TOTAL_DOCS).toBe(208);
    expect(typeof m.MOCK_DATA_VERSION).toBe('string');
  });
});
