/**
 * @fileoverview Testes: volunteerAssignmentService (TASK-274).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVolunteerAssignmentSchema,
  updateVolunteerAssignmentSchema,
  listAssignmentsOptionsSchema,
  isAssignmentActive,
} from '@/modules/shelter/domain/operational/volunteerAssignment';

describe('VOLUNTEER_ASSIGNMENT_CAPABILITIES', () => {
  const { VOLUNTEER_ASSIGNMENT_CAPABILITIES } = require('@/modules/shelter/domain/operational/volunteerAssignment');

  it('inclui roles de evento', () => {
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('carregamento');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('transporte_ida');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('transporte_volta');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('cuidador');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('outro');
  });

  it('inclui capabilities extras', () => {
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('general_help');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('photography');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('foster_support');
    expect(VOLUNTEER_ASSIGNMENT_CAPABILITIES).toContain('admin_tasks');
  });

  it('não contém duplicatas', () => {
    const set = new Set(VOLUNTEER_ASSIGNMENT_CAPABILITIES);
    expect(set.size).toBe(VOLUNTEER_ASSIGNMENT_CAPABILITIES.length);
  });
});

describe('createVolunteerAssignmentSchema', () => {
  it('valida input válido completo', () => {
    const input = {
      volunteer_uid: 'uid123',
      capability: 'photography',
      scope: 'shelter',
      starts_at: '2026-07-01',
      ends_at: '2026-12-31',
      notes: 'Fotógrafo oficial do abrigo.',
    };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('valida input mínimo (capability obrigatoria)', () => {
    const input = { volunteer_uid: 'uid123', capability: 'general_help' };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data.scope).toBe('shelter'); // default
  });

  it('rejeita capability inválida', () => {
    const input = { volunteer_uid: 'uid123', capability: 'invalid_cap' };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejeita volunteer_uid vazio', () => {
    const input = { volunteer_uid: '', capability: 'carregamento' };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejeita starts_at com formato inválido', () => {
    const input = { volunteer_uid: 'uid123', capability: 'cuidador', starts_at: '01/07/2026' };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejeita notes com mais de 500 caracteres', () => {
    const input = { volunteer_uid: 'uid123', capability: 'outro', notes: 'x'.repeat(501) };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('valida scope pet com scope_value', () => {
    const input = {
      volunteer_uid: 'uid123',
      capability: 'foster_support',
      scope: 'pet',
      scope_value: 'pet_abc123',
    };
    const result = createVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data.scope).toBe('pet');
  });
});

describe('updateVolunteerAssignmentSchema', () => {
  it('valida update parcial (apenas ends_at)', () => {
    const input = { ends_at: '2026-08-31' };
    const result = updateVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('valida update que limpa ends_at (null)', () => {
    const input = { ends_at: null };
    const result = updateVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejeita capability inválida no update', () => {
    const input = { capability: 'not_a_capability' };
    const result = updateVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('valida update de notes', () => {
    const input = { notes: 'Atualizado em 2026-07.' };
    const result = updateVolunteerAssignmentSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('listAssignmentsOptionsSchema', () => {
  it('valida opções vazias (defaults)', () => {
    const result = listAssignmentsOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.includeExpired).toBe(false);
    expect(result.data.maxResults).toBe(200);
  });

  it('valida filtro por volunteerUid', () => {
    const result = listAssignmentsOptionsSchema.safeParse({ volunteerUid: 'uid_abc' });
    expect(result.success).toBe(true);
    expect(result.data.volunteerUid).toBe('uid_abc');
  });

  it('valida filtro por capability', () => {
    const result = listAssignmentsOptionsSchema.safeParse({ capability: 'photography' });
    expect(result.success).toBe(true);
  });

  it('rejeita maxResults > 1000', () => {
    const result = listAssignmentsOptionsSchema.safeParse({ maxResults: 2000 });
    expect(result.success).toBe(false);
  });
});

describe('isAssignmentActive', () => {
  const FIXED_NOW = new Date('2026-07-15T12:00:00Z');

  it('ativa sem datas', () => {
    const a = { volunteer_uid: 'uid', capability: 'cuidador' };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(true);
  });

  it('ativa com starts_at no passado', () => {
    const a = { volunteer_uid: 'uid', capability: 'cuidador', starts_at: '2026-01-01' };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(true);
  });

  it('ativa com starts_at no futuro', () => {
    const a = { volunteer_uid: 'uid', capability: 'cuidador', starts_at: '2026-08-01' };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(false);
  });

  it('ativa com ends_at no futuro', () => {
    const a = { volunteer_uid: 'uid', capability: 'cuidador', ends_at: '2026-12-31' };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(true);
  });

  it('expirada com ends_at no passado', () => {
    const a = { volunteer_uid: 'uid', capability: 'cuidador', ends_at: '2026-06-30' };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(false);
  });

  it('ativa dentro do período', () => {
    const a = {
      volunteer_uid: 'uid',
      capability: 'cuidador',
      starts_at: '2026-07-01',
      ends_at: '2026-07-31',
    };
    expect(isAssignmentActive(a, FIXED_NOW)).toBe(true);
  });
});
