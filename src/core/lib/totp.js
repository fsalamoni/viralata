/**
 * @fileoverview TOTP (Time-based One-Time Password) — implementação RFC 6238
 * sem dependência externa (TASK-039).
 *
 * Usa Web Crypto API (window.crypto.subtle) que está disponível em
 * navegadores modernos. Para testes em Node, usa node:crypto.
 *
 * **Fluxo**:
 * 1. Usuário ativa MFA em configurações
 * 2. Sistema gera secret (160 bits base32) + QR code URI
 * 3. Usuário escaneia QR com app (Google Authenticator, Authy, 1Password)
 * 4. Usuário digita código de 6 dígitos
 * 5. Sistema valida código
 *
 * **Segurança**:
 * - Secret nunca sai do Firestore encriptado (server-side)
 * - Código é descartado após uso
 * - Janela de 30s + tolerância ±1 step (RFC 6238 §5.2)
 * - Rate limit: 5 tentativas/min (UI)
 */

const PERIOD = 30; // 30 segundos
const DIGITS = 6;
const ALGORITHM = 'SHA-1'; // Google Authenticator usa SHA-1 por padrão

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Gera secret aleatório de 160 bits (20 bytes) em base32.
 * @returns {string} — ex: "JBSWY3DPEHPK3PXP"
 */
export function generateSecret() {
  const bytes = new Uint8Array(20);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // eslint-disable-next-line no-undef
    const nodeCrypto = require('node:crypto');
    nodeCrypto.randomFillSync(bytes);
  }
  return base32Encode(bytes);
}

/**
 * Codifica bytes em base32 (RFC 4648).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const idx = (value >> bits) & 0x1f;
      result += BASE32_ALPHABET[idx];
    }
  }
  if (bits > 0) {
    const idx = (value << (5 - bits)) & 0x1f;
    result += BASE32_ALPHABET[idx];
  }
  return result;
}

/**
 * Decodifica base32 para bytes.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function base32Decode(str) {
  const clean = str.replace(/=+$/, '').toUpperCase();
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx < 0) throw new Error('Invalid base32 character: ' + clean[i]);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Gera código TOTP a partir do secret + timestamp (RFC 6238).
 * @param {string} secret — base32
 * @param {number} [time] — ms epoch (default: now)
 * @returns {string} — 6 dígitos
 */
export async function generateTOTP(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / PERIOD);
  return generateHOTP(secret, counter);
}

async function generateHOTP(secret, counter) {
  // 8-byte counter big-endian
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await importKey(base32Decode(secret));
  const hmac = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hmacBytes = new Uint8Array(hmac);
  // Dynamic truncation (RFC 4226 §5.3)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);
  return String(code % Math.pow(10, DIGITS)).padStart(DIGITS, '0');
}

async function importKey(bytes) {
  if (typeof crypto.subtle.importKey === 'function') {
    return crypto.subtle.importKey(
      'raw', bytes, { name: 'HMAC', hash: ALGORITHM }, false, ['sign'],
    );
  }
  // eslint-disable-next-line no-undef
  const nodeCrypto = require('node:crypto');
  return nodeCrypto.createHmac('sha1', Buffer.from(bytes));
}

/**
 * Valida código TOTP. Aceita ±1 step (90s janela total).
 * @param {string} secret
 * @param {string} code — 6 dígitos
 * @param {number} [window=1]
 * @returns {Promise<boolean>}
 */
export async function verifyTOTP(secret, code, window = 1) {
  if (!/^\d{6}$/.test(String(code).trim())) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const time = now + i * PERIOD * 1000;
    const expected = await generateTOTP(secret, time);
    if (constantTimeEqual(expected, String(code).trim())) return true;
  }
  return false;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Gera URI otpauth:// para QR code.
 * @param {string} secret
 * @param {string} account — email ou uid
 * @param {string} [issuer='Viralata']
 * @returns {string}
 */
export function getOtpAuthURI(secret, account, issuer = 'Viralata') {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Schema-like config (Zod opcional).
 * @typedef {object} MfaConfig
 * @property {boolean} enabled
 * @property {string} secret — base32, 32 chars
 * @property {string[]} recoveryCodes — 8 códigos de 8 chars
 * @property {number} enrolledAt — ms epoch
 * @property {number} [lastUsedAt]
 */

export const MFA_PERIOD = PERIOD;
export const MFA_DIGITS = DIGITS;

/**
 * Gera códigos de recuperação (recovery codes) para o usuário guardar.
 * Formato: xxxx-xxxx (8 chars alfanuméricos)
 * @param {number} [count=8]
 * @returns {string[]}
 */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1
  for (let i = 0; i < count; i++) {
    let code = '';
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // eslint-disable-next-line no-undef
      const nodeCrypto = require('node:crypto');
      nodeCrypto.randomFillSync(bytes);
    }
    for (let j = 0; j < 8; j++) {
      code += alphabet[bytes[j] % alphabet.length];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  return codes;
}
