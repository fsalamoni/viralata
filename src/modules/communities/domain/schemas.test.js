/**
 * @fileoverview Tests para communityService schemas (TASK-333).
 */

import { describe, it, expect } from 'vitest';
import {
  communityEventInputSchema,
} from './schemas';

describe('communityEventInputSchema', () => {
  it('passa com payload mínimo válido', () => {
    const result = communityEventInputSchema.safeParse({ title: 'Workshop de Adoção' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Workshop de Adoção');
      expect(result.data.description).toBe('');
      expect(result.data.location).toBe('');
      expect(result.data.starts_at).toBe(null);
    }
  });

  it('passa com payload completo válido', () => {
    const result = communityEventInputSchema.safeParse({
      title: 'Feira de Adoção',
      description: 'Evento para encontrar lares para cães resgatados.',
      location: 'Praça da República, São Paulo',
      starts_at: '2026-08-01T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('descarta campos desconhecidos (passthrough)', () => {
    const result = communityEventInputSchema.safeParse({
      title: 'Evento',
      foo: 'bar',
    });
    expect(result.success).toBe(true);
  });

  it('falha sem título', () => {
    const result = communityEventInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('falha com título < 3 chars', () => {
    const result = communityEventInputSchema.safeParse({ title: 'AB' });
    expect(result.success).toBe(false);
  });

  it('falha com título > 200 chars', () => {
    const result = communityEventInputSchema.safeParse({ title: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('falha com starts_at com string inválida', () => {
    const result = communityEventInputSchema.safeParse({
      title: 'Evento',
      starts_at: 'não-é-uma-data',
    });
    expect(result.success).toBe(false);
  });

  it('aceita starts_at null', () => {
    const result = communityEventInputSchema.safeParse({ title: 'Evento', starts_at: null });
    expect(result.success).toBe(true);
  });

  it('falha com description > 4000 chars', () => {
    const result = communityEventInputSchema.safeParse({
      title: 'Evento',
      description: 'A'.repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it('falha com location > 500 chars', () => {
    const result = communityEventInputSchema.safeParse({
      title: 'Evento',
      location: 'A'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('trimma whitespace do título', () => {
    const result = communityEventInputSchema.safeParse({ title: '  Evento Real  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe('Evento Real');
  });
});
