/**
 * @fileoverview Testes do serviço da Loja v2 (SHELTER_STORE_V2). Verifica:
 *  - listMyOrders (collectionGroup por buyer_uid, ordenação client-side, club_id
 *    derivado do path);
 *  - createOrdersFromCart (reusa createOrder da v1, 1 por abrigo, best-effort);
 *  - setOrderFulfillment (grava fulfillment aditivo + activity + status);
 *  - saveProductVariants (reusa updateProduct).
 */
import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCreateOrder = vi.fn();
const mockUpdateProduct = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _ts: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collectionGroup: (db, name) => ({ _group: name }),
  doc: (db, ...path) => ({ _path: path.join('/'), id: path[path.length - 1] }),
  getDoc: (...a) => mockGetDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  query: (...a) => ({ _query: a }),
  where: (...a) => ({ _where: a }),
  serverTimestamp: () => mockServerTimestamp(),
}));
vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/services/auditService', () => ({ createAuditLog: (...a) => { mockCreateAuditLog(...a); return Promise.resolve(); } }));
vi.mock('@/core/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('./shelterStoreService', () => ({
  createOrder: (...a) => mockCreateOrder(...a),
  updateProduct: (...a) => mockUpdateProduct(...a),
}));

const svc = await import('./shelterStoreOpsService');
const { emptyCart, addToCart } = await import('@/modules/shelter/domain/store/storeCart');

const ACTOR = { uid: 'buyer1', name: 'Bruna' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listMyOrders', () => {
  it('consulta por buyer_uid, ordena desc e deriva club_id do path', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'o1', data: () => ({ shelter_club_id: 'A', created_at: { seconds: 100 } }), ref: { parent: { parent: { id: 'A' } } } },
        { id: 'o2', data: () => ({ created_at: { seconds: 500 } }), ref: { parent: { parent: { id: 'B' } } } },
      ],
    });
    const rows = await svc.listMyOrders('buyer1');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(2);
    // o2 (seconds 500) vem antes de o1 (100)
    expect(rows[0].id).toBe('o2');
    expect(rows[0].club_id).toBe('B'); // derivado do path
    expect(rows[1].club_id).toBe('A'); // do campo shelter_club_id
  });

  it('retorna [] sem uid', async () => {
    expect(await svc.listMyOrders('')).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

describe('getOrder', () => {
  it('lê um pedido específico', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'o9', data: () => ({ status: 'paid' }) });
    const o = await svc.getOrder('A', 'o9');
    expect(o).toMatchObject({ id: 'o9', club_id: 'A', status: 'paid' });
  });
  it('null quando não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await svc.getOrder('A', 'x')).toBe(null);
  });
});

describe('createOrdersFromCart', () => {
  it('cria um pedido por abrigo reusando createOrder', async () => {
    mockCreateOrder.mockImplementation(async (clubId) => ({ id: `order-${clubId}` }));
    let cart = emptyCart();
    cart = addToCart(cart, { club_id: 'A', club_name: 'Abrigo A', product_id: 'p1', name: 'Ração', price_cents: 5000 }, 1);
    cart = addToCart(cart, { club_id: 'B', club_name: 'Abrigo B', product_id: 'p2', name: 'Coleira', price_cents: 2000 }, 2);
    const res = await svc.createOrdersFromCart(ACTOR, cart, { buyer: { buyer_name: 'Bruna', contact: '11999' } });
    expect(mockCreateOrder).toHaveBeenCalledTimes(2);
    expect(res.every((r) => r.ok)).toBe(true);
    expect(res.map((r) => r.club_id).sort()).toEqual(['A', 'B']);
    expect(res[0].order_id).toContain('order-');
  });

  it('best-effort: falha de um abrigo não aborta os demais', async () => {
    mockCreateOrder.mockImplementation(async (clubId) => {
      if (clubId === 'A') throw new Error('boom');
      return { id: `order-${clubId}` };
    });
    let cart = emptyCart();
    cart = addToCart(cart, { club_id: 'A', club_name: 'Abrigo A', product_id: 'p1', name: 'Ração', price_cents: 5000 }, 1);
    cart = addToCart(cart, { club_id: 'B', club_name: 'Abrigo B', product_id: 'p2', name: 'Coleira', price_cents: 2000 }, 1);
    const res = await svc.createOrdersFromCart(ACTOR, cart, { buyer: { buyer_name: 'Bruna', contact: '11999' } });
    expect(res).toHaveLength(2);
    const a = res.find((r) => r.club_id === 'A');
    const b = res.find((r) => r.club_id === 'B');
    expect(a.ok).toBe(false);
    expect(a.error).toBeTruthy();
    expect(b.ok).toBe(true);
  });

  it('lança sem autenticação e com carrinho vazio', async () => {
    await expect(svc.createOrdersFromCart({}, emptyCart(), {})).rejects.toThrow(/autenticado/);
    await expect(svc.createOrdersFromCart(ACTOR, emptyCart(), {})).rejects.toThrow(/vazio/);
  });
});

describe('setOrderFulfillment', () => {
  it('grava fulfillment aditivo + activity e status quando markShipped', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ activity: [{ id: 'a0' }] }) });
    await svc.setOrderFulfillment('A', 'o1', ACTOR, {
      carrier: 'Correios', tracking_code: 'BR123', tracking_url: 'https://t/BR123',
    }, { markShipped: true });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const patch = mockUpdateDoc.mock.calls[0][1];
    expect(patch.fulfillment).toMatchObject({ carrier: 'Correios', tracking_code: 'BR123' });
    expect(patch.status).toBe('shipped');
    expect(patch.activity).toHaveLength(2); // preserva a0 + nova
    expect(patch.activity[1].type).toBe('fulfillment');
  });

  it('sem markShipped não mexe no status', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
    await svc.setOrderFulfillment('A', 'o1', ACTOR, { carrier: 'Retirada' });
    const patch = mockUpdateDoc.mock.calls[0][1];
    expect(patch.status).toBeUndefined();
  });

  it('valida URL inválida', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });
    await expect(svc.setOrderFulfillment('A', 'o1', ACTOR, { tracking_url: 'not-a-url' })).rejects.toBeTruthy();
  });

  it('lança erro explícito e não grava quando o pedido não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    await expect(svc.setOrderFulfillment('A', 'inexistente', ACTOR, { carrier: 'Correios' }))
      .rejects.toThrow(/não encontrado/i);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('saveProductVariants', () => {
  it('reusa updateProduct com o campo variants', async () => {
    await svc.saveProductVariants('A', 'p1', ACTOR, [{ id: 'm', label: 'M', price_cents: 6000 }]);
    expect(mockUpdateProduct).toHaveBeenCalledWith('A', 'p1', ACTOR, { variants: [{ id: 'm', label: 'M', price_cents: 6000 }] });
  });
});
