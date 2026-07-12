import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { processAccountPurge, PURGE_DAYS } = require('./accountPurgeCronCore');

function makeDoc(id) {
  return { id, ref: { path: `users/${id}` }, data: () => ({ deleted_at: '2020-01-01' }) };
}

describe('accountPurgeCron (TASK-186)', () => {
  it('PURGE_DAYS é 30 (janela de arrependimento LGPD)', () => {
    expect(PURGE_DAYS).toBe(30);
  });

  it('purga cada user via recursiveDelete', async () => {
    const recursiveDelete = vi.fn().mockResolvedValue();
    const result = await processAccountPurge(
      { db: { recursiveDelete } },
      [makeDoc('a'), makeDoc('b')],
      { info: () => {}, error: () => {} },
    );
    expect(recursiveDelete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ purged: 2, errors: 0 });
  });

  it('erro em um user não bloqueia os demais', async () => {
    const recursiveDelete = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce();
    const result = await processAccountPurge(
      { db: { recursiveDelete } },
      [makeDoc('a'), makeDoc('b')],
      { info: () => {}, error: () => {} },
    );
    expect(result).toEqual({ purged: 1, errors: 1 });
  });

  it('lista vazia retorna zeros', async () => {
    const result = await processAccountPurge({ db: { recursiveDelete: vi.fn() } }, [], {});
    expect(result).toEqual({ purged: 0, errors: 0 });
  });
});
