/**
 * @fileoverview Testes do middleware de rate limit.
 *
 * Valida:
 *  - Janela de tempo: bloqueia após N reqs dentro da janela
 *  - Reset após expirar a janela
 *  - Keys isoladas por IP
 *  - Headers HTTP padrão (X-RateLimit-*, Retry-After)
 *  - Bypass via env var RATE_LIMIT_DISABLED=true
 *  - Wrapper withRateLimit só chama o handler se o limiter deixar passar
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyRateLimit,
  createRateLimit,
  defaultKeyExtractor,
  withRateLimit,
  _resetRateLimitBucket,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX,
} from './rateLimit';

function makeRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = String(value); },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function makeReq({ ip = '203.0.113.1', forwarded, socketAddr } = {}) {
  return {
    ip,
    headers: forwarded
      ? { 'x-forwarded-for': forwarded }
      : {},
    socket: socketAddr ? { remoteAddress: socketAddr } : undefined,
  };
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    _resetRateLimitBucket();
    // Garante que env var de bypass está desligada
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it('permite até max-1 reqs, bloqueia na max-ésima', () => {
    const now = vi.fn(() => 1_000);
    const limiter = createRateLimit({ windowMs: 1_000, max: 3, now });

    const req = makeReq({ ip: '198.51.100.1' });
    const res = makeRes();

    expect(limiter(req, res)).toBe(true);
    expect(limiter(req, res)).toBe(true);
    expect(limiter(req, res)).toBe(true);  // 3ª passa, é o limite
    // 4ª deve bloquear
    const r = limiter(req, res);
    expect(r).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toBe('rate_limited');
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('isola buckets por IP', () => {
    const now = vi.fn(() => 1_000);
    const limiter = createRateLimit({ windowMs: 1_000, max: 1, now });

    const a = makeRes();
    const b = makeRes();
    expect(limiter(makeReq({ ip: '198.51.100.1' }), a)).toBe(true);
    expect(limiter(makeReq({ ip: '198.51.100.2' }), b)).toBe(true);
    // Ambos passaram — buckets separados
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    // Mas o 2º request do mesmo IP bloqueia
    const a2 = makeRes();
    expect(limiter(makeReq({ ip: '198.51.100.1' }), a2)).toBe(false);
    expect(a2.statusCode).toBe(429);
  });

  it('reseta o bucket depois da janela', () => {
    let t = 1_000;
    const now = vi.fn(() => t);
    const limiter = createRateLimit({ windowMs: 1_000, max: 1, now });

    const req = makeReq({ ip: '198.51.100.5' });
    const r1 = makeRes();
    const r2 = makeRes();
    const r3 = makeRes();

    expect(limiter(req, r1)).toBe(true);
    expect(limiter(req, r2)).toBe(false);
    // Avança o tempo para além da janela
    t = 2_500;
    expect(limiter(req, r3)).toBe(true);
    expect(r3.statusCode).toBe(200);
  });

  it('emite headers X-RateLimit-* em todas as respostas (passa e bloqueia)', () => {
    const now = vi.fn(() => 1_000);
    const limiter = createRateLimit({ windowMs: 1_000, max: 2, now });

    const req = makeReq({ ip: '198.51.100.7' });
    const r1 = makeRes();
    const r2 = makeRes();
    const r3 = makeRes();

    limiter(req, r1);
    expect(r1.headers['X-RateLimit-Limit']).toBe('2');
    expect(r1.headers['X-RateLimit-Remaining']).toBe('1');

    limiter(req, r2);
    expect(r2.headers['X-RateLimit-Remaining']).toBe('0');

    limiter(req, r3);
    expect(r3.statusCode).toBe(429);
    expect(r3.headers['Retry-After']).toBeDefined();
    expect(r3.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('respeita RATE_LIMIT_DISABLED=true (bypass total)', () => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    const limiter = createRateLimit({ windowMs: 1_000, max: 1 });
    const req = makeReq({ ip: '198.51.100.99' });
    for (let i = 0; i < 5; i++) {
      expect(limiter(req, makeRes())).toBe(true);
    }
  });

  it('defaultKeyExtractor usa x-forwarded-for (primeiro IP da lista)', () => {
    const req = { headers: { 'x-forwarded-for': '192.0.2.1, 10.0.0.1, 10.0.0.2' } };
    expect(defaultKeyExtractor(req)).toBe('192.0.2.1');
  });

  it('defaultKeyExtractor cai para socket.remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    expect(defaultKeyExtractor(req)).toBe('127.0.0.1');
  });

  it('defaultKeyExtractor retorna "unknown" se nada disponível', () => {
    expect(defaultKeyExtractor({})).toBe('unknown');
    expect(defaultKeyExtractor(null)).toBe('unknown');
  });

  it('withRateLimit bloqueia o handler quando limite excedido', async () => {
    const limiter = createRateLimit({ windowMs: 1_000, max: 1, now: () => 1_000 });
    const handler = vi.fn(async (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const wrapped = withRateLimit(handler, { windowMs: 1_000, max: 1, now: () => 1_000 });

    const req = makeReq({ ip: '198.51.100.42' });
    const r1 = makeRes();
    const r2 = makeRes();

    await wrapped(req, r1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(r1.statusCode).toBe(200);

    await wrapped(req, r2);
    // 2ª chamada bloqueada — handler NÃO foi chamado de novo
    expect(handler).toHaveBeenCalledTimes(1);
    expect(r2.statusCode).toBe(429);
  });

  it('withRateLimit propaga exceções do handler', async () => {
    const wrapped = withRateLimit(
      async () => { throw new Error('boom'); },
      { windowMs: 1_000, max: 100, now: () => 1_000 },
    );
    await expect(wrapped(makeReq(), makeRes())).rejects.toThrow('boom');
  });


  it('applyRateLimit lê RATE_LIMIT_WINDOW_MS e RATE_LIMIT_MAX do env', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '5_000';
    process.env.RATE_LIMIT_MAX = '2';
    const req = makeReq({ ip: '198.51.100.55' });
    expect(applyRateLimit(req, makeRes())).toBe(true);
    expect(applyRateLimit(req, makeRes())).toBe(true);
    const r = makeRes();
    expect(applyRateLimit(req, r)).toBe(false);
    expect(r.headers['X-RateLimit-Limit']).toBe('2');
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it('expose defaults razoáveis (60s / 100 req)', () => {
    expect(DEFAULT_WINDOW_MS).toBe(60_000);
    expect(DEFAULT_MAX).toBe(100);
  });
});
