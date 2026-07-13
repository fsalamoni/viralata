/**
 * @fileoverview Testes do mockDataService — foco em isCallableUnreachable.
 *
 * Cobre a heurística que distingue "Cloud Function deploy pendente / CORS
 * bloqueado / função em cold-start" de "erro de permissão / validação".
 * Sem essa distinção o painel admin mostra "Erro interno" sem dica do
 * problema real — e o dono da plataforma não sabe que o CI do último
 * push para main provavelmente está em vermelho.
 */

import { describe, it, expect } from 'vitest';
import { isCallableUnreachable, MockError } from './mockDataService.js';

describe('mockDataService · isCallableUnreachable', () => {
  it('detecta FirebaseError "functions/internal" (CORS preflight falhou)', () => {
    const err = { code: 'functions/internal', message: 'internal' };
    expect(isCallableUnreachable(err)).toBe(true);
  });

  it('detecta FirebaseError "functions/unavailable"', () => {
    const err = { code: 'functions/unavailable', message: 'service unavailable' };
    expect(isCallableUnreachable(err)).toBe(true);
  });

  it('detecta "internal" cru (algumas versões do SDK normalizam assim)', () => {
    const err = { code: 'internal', message: 'internal' };
    expect(isCallableUnreachable(err)).toBe(true);
  });

  it('detecta mensagem de CORS', () => {
    expect(isCallableUnreachable({ code: 'unknown', message: 'blocked by CORS policy' })).toBe(true);
    expect(isCallableUnreachable({ code: 'unknown', message: 'preflight request failed' })).toBe(true);
    expect(isCallableUnreachable({ code: 'unknown', message: 'Failed to fetch' })).toBe(true);
  });

  it('detecta 403 Forbidden do gateway em qualquer função de mock', () => {
    expect(isCallableUnreachable({ code: 'unknown', message: 'Forbidden - getMockStatus' })).toBe(true);
    expect(isCallableUnreachable({ code: 'unknown', message: 'Forbidden - loadMockData' })).toBe(true);
    expect(isCallableUnreachable({ code: 'unknown', message: 'Forbidden - clearMockData' })).toBe(true);
  });

  it('NÃO classifica erros de permissão como unreachable', () => {
    expect(isCallableUnreachable({ code: 'functions/permission-denied', message: 'permission denied' })).toBe(false);
    expect(isCallableUnreachable({ code: 'functions/unauthenticated', message: 'unauth' })).toBe(false);
  });

  it('NÃO classifica erros de validação como unreachable', () => {
    expect(isCallableUnreachable({ code: 'functions/invalid-argument', message: 'realUid é obrigatório' })).toBe(false);
  });

  it('NÃO classifica erros "not-found" como unreachable', () => {
    expect(isCallableUnreachable({ code: 'functions/not-found', message: 'not found' })).toBe(false);
  });

  it('retorna false para null/undefined', () => {
    expect(isCallableUnreachable(null)).toBe(false);
    expect(isCallableUnreachable(undefined)).toBe(false);
    expect(isCallableUnreachable({})).toBe(false);
  });

  it('é case-insensitive nos códigos', () => {
    expect(isCallableUnreachable({ code: 'FUNCTIONS/INTERNAL', message: 'x' })).toBe(true);
    expect(isCallableUnreachable({ code: 'Functions/Internal', message: 'x' })).toBe(true);
  });
});

describe('mockDataService · MockError', () => {
  it('preserva code e message', () => {
    const err = new MockError('MOCK_FN_UNREACHABLE', 'função fora do ar');
    expect(err.name).toBe('MockError');
    expect(err.code).toBe('MOCK_FN_UNREACHABLE');
    expect(err.message).toBe('função fora do ar');
    expect(err).toBeInstanceOf(Error);
  });
});
