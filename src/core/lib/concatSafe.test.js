import { describe, it, expect } from 'vitest';
import { concatSafe } from './concatSafe';

describe('concatSafe (TASK-103)', () => {
  it('sem argumentos retorna []', () => {
    expect(concatSafe()).toEqual([]);
  });

  it('undefined retorna []', () => {
    expect(concatSafe(undefined)).toEqual([]);
  });

  it('null retorna []', () => {
    expect(concatSafe(null)).toEqual([]);
  });

  it('array vazio retorna []', () => {
    expect(concatSafe([])).toEqual([]);
  });

  it('um array simples é copiado', () => {
    expect(concatSafe([1, 2])).toEqual([1, 2]);
  });

  it('dois arrays são concatenados na ordem', () => {
    expect(concatSafe([1], [2, 3])).toEqual([1, 2, 3]);
  });

  it('mistura de array com undefined/null ignora o lixo', () => {
    expect(concatSafe([1], undefined, null, [2])).toEqual([1, 2]);
  });

  it('objeto não-array é ignorado', () => {
    expect(concatSafe({ length: 2, 0: 'a', 1: 'b' }, [3])).toEqual([3]);
  });

  it('string é ignorada (não é iterada char a char)', () => {
    expect(concatSafe('abc', [1])).toEqual([1]);
  });

  it('número e boolean são ignorados', () => {
    expect(concatSafe(42, true, [1])).toEqual([1]);
  });

  it('preserva itens falsy dentro de arrays válidos', () => {
    expect(concatSafe([0, null, undefined, ''], [false])).toEqual([0, null, undefined, '', false]);
  });

  it('não muta as fontes', () => {
    const a = [1];
    const b = [2];
    const out = concatSafe(a, b);
    out.push(99);
    expect(a).toEqual([1]);
    expect(b).toEqual([2]);
  });
});
