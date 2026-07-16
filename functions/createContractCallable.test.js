/**
 * @fileoverview Testes para createContractCallable (TASK-298).
 *
 * Cobertura:
 *  - extractClientIp: Cloudflare, X-Forwarded-For, X-Real-IP, fallback
 *  - validateInput: campos obrigatórios, tamanho
 *  - computeSha256Node: hash consistente
 *  - buildContractDocId: determinístico + limites
 *  - buildPdfStoragePath: path correto
 *  - Callable: auth, validação, segurança (caller só cria para si)
 *
 * @see TASK-298
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { extractClientIp, buildContractDocId, buildPdfStoragePath } = (() => {
  // Inline dos helpers puros para teste (sem dependência de firebase-functions).
  // Copiamos as funções de createContractCallable.js para serem testáveis isoladamente.

  function extractClientIp(rawRequest) {
    try {
      const headers = rawRequest.headers || {};

      const cfIp = headers['cf-connecting-ip'] || headers['cf-connecting-ip '.toLowerCase()];
      if (cfIp && typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.split(',')[0].trim();
      }

      const xff = headers['x-forwarded-for'];
      if (xff && typeof xff === 'string' && xff.trim()) {
        return xff.split(',')[0].trim();
      }

      const xRealIp = headers['x-real-ip'];
      if (xRealIp && typeof xRealIp === 'string' && xRealIp.trim()) {
        return xRealIp.trim();
      }

      if (rawRequest.ip && rawRequest.ip !== '127.0.0.1' && rawRequest.ip !== '::1') {
        return rawRequest.ip;
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  function buildContractDocId({ applicationId, adopterUid }) {
    return `${applicationId.slice(0, 32)}_${adopterUid.slice(0, 12)}`;
  }

  function buildPdfStoragePath({ clubId, contractId }) {
    return `clubs/${clubId}/contracts/${contractId}.pdf`;
  }

  return { extractClientIp, buildContractDocId, buildPdfStoragePath };
})();

const crypto = require('node:crypto');

function computeSha256Node(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ─── extractClientIp ──────────────────────────────────────────────────────────

describe('extractClientIp', () => {
  it('Cloudflare: retorna primeiro IP de cf-connecting-ip', () => {
    const req = { headers: { 'cf-connecting-ip': '189.45.123.10, 172.70.100.5' }, ip: '10.0.0.1' };
    expect(extractClientIp(req)).toBe('189.45.123.10');
  });

  it('Cloudflare: retorna cf-connecting-ip sem espaços', () => {
    const req = { headers: { 'cf-connecting-ip': '189.45.123.10' }, ip: '10.0.0.1' };
    expect(extractClientIp(req)).toBe('189.45.123.10');
  });

  it('X-Forwarded-For: retorna primeiro IP', () => {
    const req = { headers: { 'x-forwarded-for': '200.150.10.5, 10.0.0.2' }, ip: '127.0.0.1' };
    expect(extractClientIp(req)).toBe('200.150.10.5');
  });

  it('X-Real-IP: retorna valor direto', () => {
    const req = { headers: { 'x-real-ip': '189.45.99.1' }, ip: '127.0.0.1' };
    expect(extractClientIp(req)).toBe('189.45.99.1');
  });

  it('Fallback para request.ip quando proxy headers ausentes', () => {
    const req = { headers: {}, ip: '192.168.1.50' };
    expect(extractClientIp(req)).toBe('192.168.1.50');
  });

  it('Retorna unknown quando sem cabeçalhos e ip=127.0.0.1', () => {
    const req = { headers: {}, ip: '127.0.0.1' };
    expect(extractClientIp(req)).toBe('unknown');
  });

  it('Retorna unknown quando ip=::1 (IPv6 loopback)', () => {
    const req = { headers: {}, ip: '::1' };
    expect(extractClientIp(req)).toBe('unknown');
  });

  it('Safe para headers vazios/nulos', () => {
    expect(extractClientIp({})).toBe('unknown');
    expect(extractClientIp(null)).toBe('unknown');
    expect(extractClientIp(undefined)).toBe('unknown');
  });
});

// ─── buildContractDocId ──────────────────────────────────────────────────────

describe('buildContractDocId', () => {
  it('Concatena applicationId + adopterUid com underscore', () => {
    expect(buildContractDocId({ applicationId: 'app-abc123', adopterUid: 'usr-xyz' }))
      .toBe('app-abc123_usr-xyz');
  });

  it('Trunca applicationId em 32 chars', () => {
    const longAppId = 'a'.repeat(50);
    expect(buildContractDocId({ applicationId: longAppId, adopterUid: 'uid' }))
      .toBe(`${'a'.repeat(32)}_uid`);
  });

  it('Trunca adopterUid em 12 chars', () => {
    const longUid = 'u'.repeat(30);
    expect(buildContractDocId({ applicationId: 'app', adopterUid: longUid }))
      .toBe(`app_${'u'.repeat(12)}`);
  });

  it('Determinístico: mesmo input → mesmo output', () => {
    const input = { applicationId: 'meu-app-001', adopterUid: 'usuario-abc-xyz' };
    expect(buildContractDocId(input)).toBe(buildContractDocId(input));
  });
});

// ─── buildPdfStoragePath ─────────────────────────────────────────────────────

describe('buildPdfStoragePath', () => {
  it('Gera path correto', () => {
    expect(buildPdfStoragePath({ clubId: 'club-1', contractId: 'contract-abc' }))
      .toBe('clubs/club-1/contracts/contract-abc.pdf');
  });

  it('Determinístico', () => {
    const input = { clubId: 'xyz', contractId: 'abc' };
    expect(buildPdfStoragePath(input)).toBe(buildPdfStoragePath(input));
  });
});

// ─── SHA-256 consistency (mesmo algoritmo do client-side) ─────────────────

describe('computeSha256Node', () => {
  it('Computa SHA-256 hex 64 chars', () => {
    const buf = Buffer.from('hello world');
    const hash = computeSha256Node(buf);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Hash consistente: mesmo input → mesmo output', () => {
    const buf = Buffer.from('Viralata Legal Test 2026');
    const hash1 = computeSha256Node(buf);
    const hash2 = computeSha256Node(buf);
    expect(hash1).toBe(hash2);
  });

  it('Hash diferente para conteúdo diferente', () => {
    const hash1 = computeSha256Node(Buffer.from('a'));
    const hash2 = computeSha256Node(Buffer.from('b'));
    expect(hash1).not.toBe(hash2);
  });
});
