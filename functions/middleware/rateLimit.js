/**
 * @fileoverview Middleware genérico de rate limiting para Cloud Functions.
 *
 * Implementa um limiter em memória (in-process) com janela deslizante
 * simples — adequado para Cloud Functions com `maxInstances` baixo (o
 * estado não é compartilhado entre instâncias; aceita-se o trade-off
 * porque a chave é "limite por IP por minuto" e o desvio entre
 * instâncias é aceitável para mitigação de abuso). Para deployments
 * multi-instância de alto tráfego, troque pelo `express-rate-limit`
 * (declarado em `functions/package.json`) com um store distribuído
 * (Firestore / Redis).
 *
 * Configuração por env var:
 *   - RATE_LIMIT_WINDOW_MS  (default 60_000 = 1 minuto)
 *   - RATE_LIMIT_MAX        (default 100 req / janela)
 *   - RATE_LIMIT_DISABLED   (set "true" para desligar em testes locais)
 *
 * Aplica-se via wrapper:
 *
 *   const { withRateLimit } = require('./middleware/rateLimit');
 *   exports.handler = onRequest(withRateLimit(async (req, res) => { ... }));
 *
 * Ou via guard explícito:
 *
 *   const { applyRateLimit } = require('./middleware/rateLimit');
 *   exports.handler = onRequest(async (req, res) => {
 *     if (!applyRateLimit(req, res)) return;
 *     // ... handler real
 *   });
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 20 (Segurança Avançada)
 * @see docs/SECURITY_AUDIT.md (checklist de pentest)
 */

/**
 * @typedef {Object} RateLimitOptions
 * @property {number} [windowMs] Janela em ms (default 60_000).
 * @property {number} [max]       Máximo de req por janela por chave (default 100).
 * @property {string} [keyPrefix] Prefixo da chave (default '').
 * @property {(req: import('express').Request | object) => string} [keyExtractor]
 *           Extrator de chave — default usa IP do header x-forwarded-for ou
 *           `req.ip`/`req.socket.remoteAddress`.
 * @property {() => number} [now] Função de tempo — injetável para testes.
 */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;

/**
 * Map de chaves → { count, resetAt }. Singleton em memória.
 * @type {Map<string, { count: number, resetAt: number }>}
 */
const bucket = new Map();

/**
 * Extrai a chave de rate limit do request. Aceita tanto a forma
 * `express` (req.ip, req.headers) quanto a forma crua de Node
 * (req.socket.remoteAddress) quanto o body de `onRequest` do
 * firebase-functions/v2 (que tem `req.ip` emulando express).
 *
 * @param {object} req
 * @returns {string}
 */
function defaultKeyExtractor(req) {
  if (!req) return 'unknown';
  // 1) req.ip (express-like — firebase-functions v2 onRequest popula)
  if (typeof req.ip === 'string' && req.ip) return req.ip;
  // 2) x-forwarded-for
  const fwd = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']);
  if (typeof fwd === 'string' && fwd.length > 0) {
    // Pode ser uma lista "client, proxy1, proxy2" — pegue o primeiro
    return fwd.split(',')[0].trim();
  }
  // 3) socket.remoteAddress
  if (req.socket && typeof req.socket.remoteAddress === 'string') {
    return req.socket.remoteAddress;
  }
  // 4) connection.remoteAddress (HTTP/1.1)
  if (req.connection && typeof req.connection.remoteAddress === 'string') {
    return req.connection.remoteAddress;
  }
  return 'unknown';
}

/**
 * Cria um middleware de rate limit com a forma `(req, res) => boolean`.
 * Retorna `true` se a request pode prosseguir, `false` se foi bloqueada
 * (nesse caso o middleware já respondeu 429 e setou headers padrão).
 *
 * @param {RateLimitOptions} [options]
 * @returns {(req: object, res: object) => boolean}
 */
function createRateLimit(options = {}) {
  const windowMs = Number(options.windowMs) > 0 ? Number(options.windowMs) : DEFAULT_WINDOW_MS;
  const max = Number(options.max) > 0 ? Number(options.max) : DEFAULT_MAX;
  const keyPrefix = options.keyPrefix || '';
  const keyExtractor = options.keyExtractor || defaultKeyExtractor;
  const now = options.now || (() => Date.now());

  return function applyRateLimit(req, res) {
    // Bypass: ambiente de teste local pode desligar globalmente
    if (process.env.RATE_LIMIT_DISABLED === 'true') return true;

    // Janela rolante simples: cada chave tem um bucket que expira em
    // resetAt. Quando expira, o bucket é resetado.
    const key = `${keyPrefix}${keyExtractor(req)}`;
    const ts = now();
    const entry = bucket.get(key);

    if (!entry || entry.resetAt <= ts) {
      bucket.set(key, { count: 1, resetAt: ts + windowMs });
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', String(max - 1));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil((ts + windowMs) / 1000)));
      }
      return true;
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - ts) / 1000));
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('X-RateLimit-Limit', String(max));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
        res.setHeader('Retry-After', String(retryAfter));
      }
      if (res && typeof res.status === 'function') {
        res.status(429).json({
          error: 'rate_limited',
          message: `Limite de ${max} requisições por ${Math.round(windowMs / 1000)}s atingido. Tente novamente em ${retryAfter}s.`,
          retry_after_seconds: retryAfter,
        });
      }
      return false;
    }

    entry.count += 1;
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    }
    return true;
  };
}

/**
 * Aplica rate limit lendo configuração de env vars. Singleton —
 * todos os callers da função sem opções compartilham o mesmo
 * bucket (mesma janela/max).
 *
 * @param {object} req
 * @param {object} res
 * @returns {boolean} true se passou, false se bloqueado
 */
function applyRateLimit(req, res) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) > 0
    ? Number(process.env.RATE_LIMIT_WINDOW_MS)
    : DEFAULT_WINDOW_MS;
  const max = Number(process.env.RATE_LIMIT_MAX) > 0
    ? Number(process.env.RATE_LIMIT_MAX)
    : DEFAULT_MAX;
  return createRateLimit({ windowMs, max })(req, res);
}

/**
 * Wrapper: aplica rate limit antes de delegar ao handler. Se o
 * limiter bloquear, responde 429 e não chama o handler.
 *
 * @param {(req: object, res: object) => Promise<any>|any} handler
 * @param {RateLimitOptions} [options]
 * @returns {(req: object, res: object) => Promise<void>}
 */
function withRateLimit(handler, options) {
  const limiter = createRateLimit(options || {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) > 0
      ? Number(process.env.RATE_LIMIT_WINDOW_MS)
      : DEFAULT_WINDOW_MS,
    max: Number(process.env.RATE_LIMIT_MAX) > 0
      ? Number(process.env.RATE_LIMIT_MAX)
      : DEFAULT_MAX,
  });
  return async function rateLimitedHandler(req, res) {
    if (!limiter(req, res)) return;
    // Re-encaminha qualquer exceção para o handler de erro do
    // Firebase (vai gerar resposta 500 padrão). O logging fica por
    // conta do caller.
    await handler(req, res);
  };
}

/**
 * Limpa o bucket em memória. Útil entre testes para evitar vazamento
 * de estado entre specs. Não usar em produção.
 */
function _resetRateLimitBucket() {
  bucket.clear();
}

/**
 * @returns {{ size: number, keys: string[] }} Inspeção do estado atual
 * (apenas para diagnóstico / testes).
 */
function _inspectRateLimitBucket() {
  return {
    size: bucket.size,
    keys: Array.from(bucket.keys()),
  };
}

module.exports = {
  applyRateLimit,
  createRateLimit,
  defaultKeyExtractor,
  withRateLimit,
  // exportados com underscore por serem utilitários internos (testes)
  _resetRateLimitBucket,
  _inspectRateLimitBucket,
  // constantes para testes
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX,
};
