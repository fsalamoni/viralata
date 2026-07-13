/**
 * @fileoverview Testes TASK-241: volunteer entity + LGPD sanitize.
 *
 * Cobre:
 *  - sanitizePii: email, phone, address, notes
 *  - SEARCH_ENTITIES.volunteer: campos corretos
 *  - buildSearchQuery para volunteer: shelterId obrigatório,
 *    array-contains (skills, availability_days), has_vehicle
 *  - mapDocToResult: aplica sanitize quando lgpdSanitize=true
 *  - getSearchableEntities inclui volunteer
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePii,
  buildSearchQuery,
  mapDocToResult,
  getSearchableEntities,
  SEARCH_ENTITIES,
} from './search';

describe('TASK-241: sanitizePii', () => {
  it('extrai só o domínio do email', () => {
    expect(sanitizePii({ email: 'joao.silva@gmail.com' })).toEqual({ email: 'gmail.com' });
    expect(sanitizePii({ contact_email: 'maria.uva@empresa.com.br' })).toEqual({ contact_email: 'empresa.com.br' });
  });

  it('redige email mal-formado', () => {
    expect(sanitizePii({ email: 'invalido' })).toEqual({ email: '[redacted]' });
  });

  it('mascara phone mantendo 5 primeiros dígitos', () => {
    expect(sanitizePii({ phone: '11999887766' })).toEqual({ phone: '11999-****' });
    expect(sanitizePii({ contact_phone: '(11) 99988-7766' })).toEqual({ contact_phone: '11999-****' });
    expect(sanitizePii({ mobile: '+55 11 99988-7766' })).toEqual({ mobile: '55119-****' });
  });

  it('redige phone curto demais', () => {
    expect(sanitizePii({ phone: '1234' })).toEqual({ phone: '[redacted]' });
  });

  it('omite address, notes, bio, description', () => {
    const result = sanitizePii({
      address: 'Rua A, 123',
      notes: 'nota interna',
      bio: 'biografia',
      description: 'descrição',
      name: 'João',
    });
    expect(result).toEqual({ name: 'João' });
  });

  it('preserva campos não-PII (skills, city, has_vehicle)', () => {
    const result = sanitizePii({
      name: 'João',
      skills: ['dog_walking', 'transport'],
      city: 'São Paulo',
      has_vehicle: true,
      availability_days: ['sat', 'sun'],
    });
    expect(result).toEqual({
      name: 'João',
      skills: ['dog_walking', 'transport'],
      city: 'São Paulo',
      has_vehicle: true,
      availability_days: ['sat', 'sun'],
    });
  });

  it('retorna {} para input inválido', () => {
    expect(sanitizePii(null)).toEqual({});
    expect(sanitizePii(undefined)).toEqual({});
    expect(sanitizePii('not a doc')).toEqual({});
  });
});

describe('TASK-241: SEARCH_ENTITIES.volunteer', () => {
  it('existe e tem campos obrigatórios', () => {
    const v = SEARCH_ENTITIES.volunteer;
    expect(v).toBeDefined();
    expect(v.id).toBe('volunteer');
    expect(v.label).toBe('Voluntários');
    expect(v.collection).toBe('volunteers');
    expect(v.isPublic).toBe(false); // multi-tenant, sempre autenticada
    expect(v.lgpdSanitize).toBe(true);
    expect(v.titleField).toBe('name');
    expect(v.urlPattern).toBe('/admin/volunteers/{id}');
  });

  it('searchableFields NÃO inclui PII direta (email/phone/notes/address)', () => {
    const v = SEARCH_ENTITIES.volunteer;
    expect(v.searchableFields).toContain('name');
    expect(v.searchableFields).toContain('skills');
    expect(v.searchableFields).toContain('city');
    expect(v.searchableFields).not.toContain('email');
    expect(v.searchableFields).not.toContain('phone');
    expect(v.searchableFields).not.toContain('address');
    expect(v.searchableFields).not.toContain('notes');
  });

  it('filterableFields tem shelter_club_id obrigatório + skills/availability_days/has_vehicle', () => {
    const f = SEARCH_ENTITIES.volunteer.filterableFields;
    expect(f.shelter_club_id.required).toBe(true);
    expect(f.skills).toEqual({ type: 'array' });
    expect(f.availability_days).toEqual({ type: 'array' });
    expect(f.has_vehicle).toEqual({ type: 'boolean' });
  });
});

describe('TASK-241: buildSearchQuery para volunteer', () => {
  const baseFilters = { shelterId: 'shelter-abc' };

  it('exige shelterId', () => {
    expect(() => buildSearchQuery('volunteer', {})).toThrow(/shelterId/);
  });

  it('cria query básica com shelter_club_id + name + orderBy', () => {
    const plan = buildSearchQuery('volunteer', baseFilters);
    expect(plan.collection).toBe('volunteers');
    expect(plan.subcollectionParent).toBeUndefined();
    expect(plan.requireShelterId).toBe(true);
    expect(plan.isPublic).toBe(false);

    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    const orderBy = plan.constraints.find((c) => c.type === 'orderBy');
    const limit = plan.constraints.find((c) => c.type === 'limit');

    expect(whereClauses).toContainEqual({
      type: 'where', field: 'shelter_club_id', op: '==', value: 'shelter-abc',
    });
    expect(orderBy.field).toBe('created_at');
    expect(limit.value).toBeGreaterThan(0);
  });

  it('filtra por skills (array-contains, 1 valor)', () => {
    const plan = buildSearchQuery('volunteer', { ...baseFilters, skills: ['dog_walking'] });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    expect(whereClauses).toContainEqual({
      type: 'where', field: 'skills', op: 'array-contains', value: 'dog_walking',
    });
  });

  it('filtra por skills (array-contains-any, N valores)', () => {
    const plan = buildSearchQuery('volunteer', {
      ...baseFilters,
      skills: ['dog_walking', 'transport'],
    });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    expect(whereClauses).toContainEqual({
      type: 'where', field: 'skills', op: 'array-contains-any', value: ['dog_walking', 'transport'],
    });
  });

  it('filtra por availability_days', () => {
    const plan = buildSearchQuery('volunteer', {
      ...baseFilters,
      availability_days: ['sat', 'sun'],
    });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    expect(whereClauses).toContainEqual({
      type: 'where', field: 'availability_days', op: 'array-contains-any', value: ['sat', 'sun'],
    });
  });

  it('filtra por has_vehicle boolean', () => {
    const plan = buildSearchQuery('volunteer', { ...baseFilters, has_vehicle: true });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    expect(whereClauses).toContainEqual({
      type: 'where', field: 'has_vehicle', op: '==', value: true,
    });
  });

  it('filtra por status', () => {
    const plan = buildSearchQuery('volunteer', { ...baseFilters, status: 'active' });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    expect(whereClauses).toContainEqual({
      type: 'where', field: 'status', op: '==', value: 'active',
    });
  });

  it('combina múltiplos filtros', () => {
    const plan = buildSearchQuery('volunteer', {
      ...baseFilters,
      query: 'joão',
      skills: ['grooming'],
      has_vehicle: true,
      status: 'active',
    });
    const whereClauses = plan.constraints.filter((c) => c.type === 'where');
    // 1) shelter_club_id, 2) status, 3) skills array-contains, 4) has_vehicle, 5+6) name prefix range
    expect(whereClauses.length).toBeGreaterThanOrEqual(6);
  });
});

describe('TASK-241: mapDocToResult aplica sanitize em volunteer', () => {
  it('omite PII no resultado', () => {
    const doc = {
      id: 'vol-1',
      name: 'João Silva',
      email: 'joao.silva@gmail.com',
      phone: '11999887766',
      address: 'Rua A, 123',
      notes: 'PII interna',
      city: 'São Paulo',
      skills: ['dog_walking'],
      shelter_club_id: 'shelter-abc',
    };
    const result = mapDocToResult(doc, 'volunteer', 'joão');
    expect(result.id).toBe('vol-1');
    expect(result.entity).toBe('volunteer');
    expect(result.title).toBe('João Silva');
    expect(result.subtitle).toBe('São Paulo');
    expect(result.url).toBe('/admin/volunteers/vol-1');
    // PII NÃO vaza no result
    expect(result.title).not.toContain('gmail');
    expect(result.subtitle).not.toContain('Rua A');
    expect(JSON.stringify(result)).not.toContain('joao.silva');
    expect(JSON.stringify(result)).not.toContain('11999');
  });

  it('NÃO sanitiza entity pública (shelter)', () => {
    const doc = {
      id: 'shelter-1',
      name: 'Abrigo A',
      email: 'contato@abrigo.org', // NÃO deve ser sanitizado
      city: 'São Paulo',
      directory_status: 'public',
    };
    const result = mapDocToResult(doc, 'shelter', 'abrigo');
    // shelter não tem lgpdSanitize, email aparece (ou ao menos, não é tocado)
    // (title e subtitle vêm dos titleField/subtitleField, não do email)
    expect(result.title).toBe('Abrigo A');
  });
});

describe('TASK-241: getSearchableEntities inclui volunteer', () => {
  it('lista 6 entities', () => {
    const list = getSearchableEntities();
    const ids = list.map((e) => e.id);
    expect(ids).toContain('volunteer');
    expect(ids).toContain('pet');
    expect(ids).toContain('adopter');
    expect(ids).toContain('shelter');
    expect(ids).toContain('foster');
    expect(ids).toContain('exhibition');
    expect(list.length).toBe(6);
  });
});
