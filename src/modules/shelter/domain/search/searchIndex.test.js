/**
 * @fileoverview TESTE: TASK-312 — Search Sync (buildSearchIndexQuery + searchSync helpers)
 */
import { describe, it, expect } from 'vitest';
import {
  buildSearchIndexQuery,
  SEARCH_INDEX_COLLECTIONS,
  SEARCH_INDEX_NAME_FIELD,
} from './search';

describe('TASK-312: buildSearchIndexQuery', () => {
  describe('SEARCH_INDEX_COLLECTIONS', () => {
    it('mapeia entity → coleção denormalizada', () => {
      expect(SEARCH_INDEX_COLLECTIONS.pet).toBe('search_pets');
      expect(SEARCH_INDEX_COLLECTIONS.shelter).toBe('search_clubs');
      expect(SEARCH_INDEX_COLLECTIONS.foster).toBe('search_fosters');
      expect(SEARCH_INDEX_COLLECTIONS.volunteer).toBe('search_volunteers');
      // Entities sem índice usam sentinel true (força fallback no buildSearchIndexQuery)
      expect(SEARCH_INDEX_COLLECTIONS.adopter).toBe(true);
      expect(SEARCH_INDEX_COLLECTIONS.exhibition).toBe(true);
    });
  });

  describe('SEARCH_INDEX_NAME_FIELD', () => {
    it('mapeia entity → campo name_lower correto', () => {
      expect(SEARCH_INDEX_NAME_FIELD.pet).toBe('name_lower');
      expect(SEARCH_INDEX_NAME_FIELD.shelter).toBe('name_lower');
      expect(SEARCH_INDEX_NAME_FIELD.foster).toBe('full_name_lower');
      expect(SEARCH_INDEX_NAME_FIELD.volunteer).toBe('name_lower');
    });
  });

  describe('pets', () => {
    it('retorna search_pets como coleção', () => {
      const plan = buildSearchIndexQuery('pet', { shelterId: 'club-1' });
      expect(plan.collection).toBe('search_pets');
      expect(plan.usesIndex).toBe(true);
    });

    it('inclui shelter_club_id obrigatório', () => {
      const plan = buildSearchIndexQuery('pet', { shelterId: 'club-1' });
      const fieldNames = plan.constraints.map((c) => c.field);
      expect(fieldNames).toContain('shelter_club_id');
    });

    it('prefix match usa name_lower (já normalizado)', () => {
      const plan = buildSearchIndexQuery('pet', { shelterId: 'club-1', query: 'BOLA' });
      const lowerQ = plan.constraints.find((c) => c.field === 'name_lower');
      expect(lowerQ).toBeDefined();
      expect(lowerQ.op).toBe('>=');
      expect(lowerQ.value).toBe('bola'); // normalizado
    });

    it('filtra por species', () => {
      const plan = buildSearchIndexQuery('pet', { shelterId: 'club-1', species: 'dog' });
      const species = plan.constraints.find((c) => c.field === 'species');
      expect(species?.value).toBe('dog');
    });

    it('requer shelterId para pet multi-tenant', () => {
      expect(() => buildSearchIndexQuery('pet', {})).toThrow('shelterId é obrigatório');
    });
  });

  describe('shelter (clubs)', () => {
    it('retorna search_clubs como coleção', () => {
      const plan = buildSearchIndexQuery('shelter', {});
      expect(plan.collection).toBe('search_clubs');
      expect(plan.usesIndex).toBe(true);
    });

    it('usa directory_status default=public', () => {
      const plan = buildSearchIndexQuery('shelter', {});
      const status = plan.constraints.find((c) => c.field === 'directory_status');
      expect(status?.value).toBe('public');
    });

    it('prefix match usa name_lower normalizado', () => {
      const plan = buildSearchIndexQuery('shelter', { query: 'CAO' });
      const lowerQ = plan.constraints.find((c) => c.field === 'name_lower');
      expect(lowerQ?.value).toBe('cao');
    });

    it('NÃO exige shelterId (entidade pública)', () => {
      expect(() => buildSearchIndexQuery('shelter', {})).not.toThrow();
    });
  });

  describe('foster', () => {
    it('retorna search_fosters como coleção', () => {
      const plan = buildSearchIndexQuery('foster', { shelterId: 'club-1' });
      expect(plan.collection).toBe('search_fosters');
      expect(plan.usesIndex).toBe(true);
    });

    it('prefix match usa full_name_lower', () => {
      const plan = buildSearchIndexQuery('foster', { shelterId: 'club-1', query: 'João' });
      const lowerQ = plan.constraints.find((c) => c.field === 'full_name_lower');
      expect(lowerQ?.value).toBe('joao');
    });
  });

  describe('volunteer', () => {
    it('retorna search_volunteers como coleção', () => {
      const plan = buildSearchIndexQuery('volunteer', { shelterId: 'club-1' });
      expect(plan.collection).toBe('search_volunteers');
      expect(plan.usesIndex).toBe(true);
    });

    it('skills usa skills_tokens no índice', () => {
      const plan = buildSearchIndexQuery('volunteer', {
        shelterId: 'club-1',
        skills: ['Transporte', 'LARANJA'],
      });
      const tokens = plan.constraints.find((c) => c.field === 'skills_tokens');
      expect(tokens).toBeDefined();
      expect(tokens?.op).toBe('array-contains-any');
      expect(tokens?.value).toContain('transporte'); // normalizado
      expect(tokens?.value).toContain('laranja');    // normalizado
    });

    it('has_vehicle é filtrado', () => {
      const plan = buildSearchIndexQuery('volunteer', {
        shelterId: 'club-1',
        has_vehicle: true,
      });
      const vehicle = plan.constraints.find((c) => c.field === 'has_vehicle');
      expect(vehicle?.value).toBe(true);
    });
  });

  describe('entities sem índice (fallback)', () => {
    it('adopter usa coleção original (sem usesIndex)', () => {
      const plan = buildSearchIndexQuery('adopter', { shelterId: 'club-1' });
      expect(plan.collection).toBe('adoption_interests');
      expect(plan.usesIndex).toBe(undefined);
    });

    it('exhibition usa coleção original (sem usesIndex)', () => {
      const plan = buildSearchIndexQuery('exhibition', { shelterId: 'club-1' });
      expect(plan.collection).toBe('exhibitions');
      expect(plan.usesIndex).toBe(undefined);
    });
  });

  describe('dateRange', () => {
    it('adiciona created_at range constraints', () => {
      const plan = buildSearchIndexQuery('pet', {
        shelterId: 'club-1',
        dateRange: { from: '2026-01-01', to: '2026-06-30' },
      });
      const from = plan.constraints.find((c) => c.field === 'created_at' && c.op === '>=');
      const to = plan.constraints.find((c) => c.field === 'created_at' && c.op === '<=');
      expect(from?.value).toContain('2026-01-01');
      expect(to?.value).toContain('2026-06-30');
    });
  });
});
