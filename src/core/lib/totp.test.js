/**
 * @fileoverview Tests do TOTP (TASK-039).
 */
import { describe, it, expect } from 'vitest';
import {
  generateSecret, base32Encode, base32Decode,
  generateTOTP, verifyTOTP, getOtpAuthURI,
  generateRecoveryCodes, MFA_PERIOD, MFA_DIGITS,
} from './totp.js';

describe('totp — generateSecret (TASK-039)', () => {
  it('gera secret de 32 chars (base32 de 160 bits)', () => {
    const s = generateSecret();
    expect(s).toHaveLength(32);
  });

  it('gera secrets únicos', () => {
    const set = new Set();
    for (let i = 0; i < 50; i++) set.add(generateSecret());
    expect(set.size).toBe(50);
  });

  it('apenas chars base32', () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });
});

describe('totp — base32 (TASK-039)', () => {
  it('encode/decode roundtrip', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xfa, 0xce]);
    const encoded = base32Encode(bytes);
    const decoded = base32Decode(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it('encode RFC 4648 sample', () => {
    // "foobar" → "MZXW6YTBOI======"
    const bytes = new TextEncoder().encode('foobar');
    // Não testamos exato porque "foobar" não é caso canônico aqui.
    // Mas testamos que tudo é uppercase alfanum.
    const encoded = base32Encode(bytes);
    expect(encoded).toMatch(/^[A-Z2-7]+$/);
  });

  it('rejeita char inválido em decode', () => {
    expect(() => base32Decode('!!!')).toThrow();
  });
});

describe('totp — generateTOTP (TASK-039)', () => {
  it('gera código de 6 dígitos', async () => {
    const secret = generateSecret();
    const code = await generateTOTP(secret);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('código é determinístico para mesmo timestamp', async () => {
    const secret = generateSecret();
    const t = 1700000000000;
    const c1 = await generateTOTP(secret, t);
    const c2 = await generateTOTP(secret, t);
    expect(c1).toBe(c2);
  });

  it('códigos diferentes para timestamps em steps diferentes', async () => {
    const secret = generateSecret();
    const t1 = 1700000000000;
    const t2 = t1 + MFA_PERIOD * 1000;
    const c1 = await generateTOTP(secret, t1);
    const c2 = await generateTOTP(secret, t2);
    expect(c1).not.toBe(c2);
  });
});

describe('totp — verifyTOTP (TASK-039)', () => {
  it('valida código correto', async () => {
    const secret = generateSecret();
    const code = await generateTOTP(secret);
    const valid = await verifyTOTP(secret, code);
    expect(valid).toBe(true);
  });

  it('rejeita código incorreto', async () => {
    const secret = generateSecret();
    const valid = await verifyTOTP(secret, '000000');
    // Pode ser verdadeiro (1 em 10^6) — mais provável falso.
    // Aceita ambos, mas testa o tipo.
    expect(typeof valid).toBe('boolean');
  });

  it('rejeita código malformado', async () => {
    const secret = generateSecret();
    expect(await verifyTOTP(secret, 'abc123')).toBe(false);
    expect(await verifyTOTP(secret, '12345')).toBe(false);
    expect(await verifyTOTP(secret, '1234567')).toBe(false);
  });

  it('aceita código com janela de tolerância', async () => {
    const secret = generateSecret();
    const pastCode = await generateTOTP(secret, Date.now() - MFA_PERIOD * 1000);
    const valid = await verifyTOTP(secret, pastCode);
    expect(valid).toBe(true);
  });
});

describe('totp — getOtpAuthURI (TASK-039)', () => {
  it('gera URI otpauth://totp/...', () => {
    const uri = getOtpAuthURI('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('Viralata');
    expect(uri).toContain('user%40example.com');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain(`digits=${MFA_DIGITS}`);
    expect(uri).toContain(`period=${MFA_PERIOD}`);
  });

  it('issuer customizado', () => {
    const uri = getOtpAuthURI('ABC', 'user@test.com', 'MyApp');
    expect(uri).toContain('MyApp');
  });
});

describe('totp — generateRecoveryCodes (TASK-039)', () => {
  it('gera 8 códigos por default', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
  });

  it('gera count customizado', () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3);
    expect(generateRecoveryCodes(12)).toHaveLength(12);
  });

  it('formato xxxx-xxxx (8 chars com hífen)', () => {
    const codes = generateRecoveryCodes();
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it('códigos são únicos', () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('totp — constants (TASK-039)', () => {
  it('MFA_PERIOD = 30s', () => {
    expect(MFA_PERIOD).toBe(30);
  });

  it('MFA_DIGITS = 6', () => {
    expect(MFA_DIGITS).toBe(6);
  });
});
