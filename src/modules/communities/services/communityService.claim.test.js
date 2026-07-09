/**
 * Testes para `claimCommunityOwnership` — função usada pra consertar
 * comunidades LEGADAS cujo `owner_id` é null (criadas em versão antiga
 * do createCommunity).
 *
 * Mocks:
 *  - firebase/firestore (doc, getDoc, updateDoc)
 *  - timestamp serverTimestamp
 *
 * Verifica:
 *  - feliz: owner_id null → seta para currentUserUid
 *  - bloqueia: comunidade não existe
 *  - bloqueia: comunidade já tem owner
 *  - valida argumentos
 *  - passa updated_at
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks têm que ser declarados ANTES do import do módulo
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((db, col, id) => ({ _path: `${col}/${id}` }));

// Mock do config do firebase — em testes, `db` é null por padrão (env não setado).
// Fornecemos um mock para `db` para que as funções que dependem dele funcionem.
vi.mock('@/core/config/firebase', () => ({
  db: { __mockDb: true },
  app: null,
  auth: null,
  functions: null,
  storage: null,
  googleProvider: null,
  firebaseServicesEnabled: true,
  firebaseDisabledReason: null,
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: () => ({ _serverTimestamp: true }),
}));

// Importar DEPOIS dos mocks
let claimCommunityOwnership;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('./communityService.js');
  claimCommunityOwnership = mod.claimCommunityOwnership;
  mockUpdateDoc.mockClear();
  mockGetDoc.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('claimCommunityOwnership', () => {
  it('seta owner_id = currentUserUid quando comunidade é órfã (owner_id === null)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'c1', name: 'Cachorródromo', owner_id: null, member_count: 1 }),
    });
    await claimCommunityOwnership('c1', 'user-abc');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: 'communities/c1' }),
      expect.objectContaining({
        owner_id: 'user-abc',
        updated_at: expect.objectContaining({ _serverTimestamp: true }),
      }),
    );
  });

  it('seta owner_id mesmo quando o campo está undefined (não presente no doc)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'c2', name: 'Cachorródromo' }), // sem owner_id
    });
    await claimCommunityOwnership('c2', 'user-xyz');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ owner_id: 'user-xyz' }),
    );
  });

  it('rejeita quando a comunidade não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await expect(claimCommunityOwnership('ghost', 'u1')).rejects.toThrow(/não encontrada/);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejeita quando a comunidade já tem um owner (NÃO rouba comunidade)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'c3', owner_id: 'outro-user' }),
    });
    await expect(claimCommunityOwnership('c3', 'user-abc')).rejects.toThrow(/já tem um dono/);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejeita argumentos vazios', async () => {
    await expect(claimCommunityOwnership('', 'u1')).rejects.toThrow();
    await expect(claimCommunityOwnership('c1', '')).rejects.toThrow();
  });
});