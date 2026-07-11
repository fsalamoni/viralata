/**
 * @fileoverview Testes do serviço de Cutover do Sistema de Gestão do Abrigo (Fase 22).
 *
 * Cobre:
 * - getCutoverStatus: retorna status de todas as flags com DEFAULT false
 * - getCutoverStatus: respeita currentFlags passadas
 * - getCutoverStatus: identifica flags faltantes
 * - validateShelterReadiness: verifica acessibilidade das collections
 * - checkCutoverReadiness: combina status + readiness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (devem vir antes dos imports) ──────────────────────────────

const mockGetDocs = vi.fn();
const mockCollectionGroup = vi.fn((db, name) => ({ _collection: name }));
const mockQuery = vi.fn((ref) => ({ _ref: ref }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collectionGroup: (...args) => mockCollectionGroup(...args),
  query: (...args) => mockQuery(...args),
  limit: mockLimit,
  getDocs: (...args) => mockGetDocs(...args),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Mock completo do constants para evitar import circular
vi.mock('@/modules/shelter/domain/constants', () => ({
  SHELTER_FEATURE_FLAG: {
    SHELTER_FOUNDATION: 'shelter_foundation',
    SHELTER_ANIMAL_UNIFIED_PROFILE: 'shelter_animal_unified_profile',
    SHELTER_PET_TIMELINE: 'shelter_pet_timeline',
    SHELTER_ADOPTION_WORKFLOW: 'shelter_adoption_workflow',
    SHELTER_ADOPTER_FULL_PROFILE: 'shelter_adopter_full_profile',
    SHELTER_POST_ADOPTION_FOLLOWUP: 'shelter_post_adoption_followup',
    SHELTER_FOSTER: 'shelter_foster',
    SHELTER_HEALTH_RECORDS: 'shelter_health_records',
    SHELTER_MEDICATION: 'shelter_medication',
    SHELTER_GALLERY: 'shelter_gallery',
    SHELTER_EXHIBITIONS: 'shelter_exhibitions',
    SHELTER_EXHIBITION_RSVPS: 'shelter_exhibition_rsvps',
    SHELTER_EXHIBITION_WORKFLOW_V1: 'shelter_exhibition_workflow_v1',
    SHELTER_VOLUNTEERS: 'shelter_volunteers',
    SHELTER_VOLUNTEER_PROFILE_V1: 'shelter_volunteer_profile_v1',
    SHELTER_DASHBOARD: 'shelter_dashboard',
    SHELTER_KANBAN: 'shelter_kanban',
    SHELTER_REPORTS: 'shelter_reports',
    SHELTER_INDICATORS: 'shelter_indicators',
    SHELTER_SMART_SEARCH: 'shelter_smart_search',
    SHELTER_LEGAL_TERMS: 'shelter_legal_terms',
    SHELTER_LEGAL_TERMS_V1: 'shelter_legal_terms_v1',
    SHELTER_SECURITY_HARDENING: 'shelter_security_hardening',
    SHELTER_PLATFORM_HEALTH: 'shelter_platform_health',
    SHELTER_CUTOVER: 'shelter_cutover',
  },
  DEFAULT_SHELTER_FLAGS: {
    shelter_foundation: false,
    shelter_animal_unified_profile: false,
    shelter_pet_timeline: false,
    shelter_adoption_workflow: false,
    shelter_adopter_full_profile: false,
    shelter_post_adoption_followup: false,
    shelter_foster: false,
    shelter_health_records: false,
    shelter_medication: false,
    shelter_gallery: false,
    shelter_exhibitions: false,
    shelter_exhibition_rsvps: false,
    shelter_exhibition_workflow_v1: false,
    shelter_volunteers: false,
    shelter_volunteer_profile_v1: false,
    shelter_dashboard: false,
    shelter_kanban: false,
    shelter_reports: false,
    shelter_indicators: false,
    shelter_smart_search: false,
    shelter_legal_terms: false,
    shelter_legal_terms_v1: false,
    shelter_security_hardening: false,
    shelter_platform_health: false,
    shelter_cutover: false,
  },
}));

// ─── Imports ────────────────────────────────────────────────────────────

const {
  getCutoverStatus,
  validateShelterReadiness,
  checkCutoverReadiness,
  SHELTER_COLLECTIONS,
  REQUIRED_FLAGS_FOR_CUTOVER,
} = await import('./cutoverService');

// ─── Tests: getCutoverStatus ───────────────────────────────────────────

describe('getCutoverStatus', () => {
  it('retorna todas as flags como false quando nenhuma é passada', () => {
    const result = getCutoverStatus({});

    expect(result.isReady).toBe(false);
    expect(result.enabledFlags).toBe(0);
    expect(result.missingFlags.length).toBe(result.totalFlags);
    expect(result.flags['shelter_foundation']).toBe(false);
    expect(result.flags['shelter_dashboard']).toBe(false);
  });

  it('retorna flags habilitadas quando passadas no currentFlags', () => {
    const currentFlags = {
      'shelter_foundation': true,
      'shelter_dashboard': true,
    };
    const result = getCutoverStatus(currentFlags);

    expect(result.flags['shelter_foundation']).toBe(true);
    expect(result.flags['shelter_dashboard']).toBe(true);
    expect(result.enabledFlags).toBe(2);
    expect(result.missingFlags).not.toContain('shelter_foundation');
  });

  it('identifica corretamente flags faltantes', () => {
    const currentFlags = {
      'shelter_foundation': true,
    };
    const result = getCutoverStatus(currentFlags);

    // shelter_foundation está em currentFlags, então NÃO deve estar em missingFlags
    expect(result.missingFlags).not.toContain('shelter_foundation');
    // Mas shelter_dashboard NÃO está, então deve estar em missingFlags
    expect(result.missingFlags).toContain('shelter_dashboard');
  });

  it('retorna isReady=true apenas quando todas as flags estão ON', () => {
    // Habilitar todas as flags
    const allEnabled = {
      'shelter_foundation': true,
      'shelter_animal_unified_profile': true,
      'shelter_pet_timeline': true,
      'shelter_adoption_workflow': true,
      'shelter_adopter_full_profile': true,
      'shelter_post_adoption_followup': true,
      'shelter_foster': true,
      'shelter_health_records': true,
      'shelter_medication': true,
      'shelter_gallery': true,
      'shelter_exhibitions': true,
      'shelter_exhibition_rsvps': true,
      'shelter_exhibition_workflow_v1': true,
      'shelter_volunteers': true,
      'shelter_volunteer_profile_v1': true,
      'shelter_dashboard': true,
      'shelter_kanban': true,
      'shelter_reports': true,
      'shelter_indicators': true,
      'shelter_smart_search': true,
      'shelter_legal_terms': true,
      'shelter_legal_terms_v1': true,
      'shelter_security_hardening': true,
      'shelter_platform_health': true,
      'shelter_cutover': true,
    };

    const result = getCutoverStatus(allEnabled);

    expect(result.isReady).toBe(true);
    expect(result.enabledFlags).toBe(result.totalFlags);
    expect(result.missingFlags.length).toBe(0);
  });
});

// ─── Tests: validateShelterReadiness ───────────────────────────────────

describe('validateShelterReadiness', () => {
  beforeEach(() => {
    mockGetDocs.mockReset().mockResolvedValue({ docs: [] });
  });

  it('retorna todas as collections como acessíveis quando getDocs funciona', async () => {
    const result = await validateShelterReadiness();

    expect(result.isAccessible).toBe(true);
    expect(result.inaccessibleCollections.length).toBe(0);
    expect(result.error).toBeNull();
    expect(mockGetDocs).toHaveBeenCalledTimes(SHELTER_COLLECTIONS.length);
  });

  it('identifica collections inacessíveis quando getDocs falha', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Permission denied'));

    const result = await validateShelterReadiness();

    expect(result.isAccessible).toBe(false);
    expect(result.inaccessibleCollections).toContain('pets');
    expect(result.error).toBeInstanceOf(Error);
  });

  it('retorna status de cada collection individualmente', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Not found'));

    const result = await validateShelterReadiness();

    expect(result.collections['pets']).toBe(false);
    expect(result.collections['clubs']).toBe(true);
  });
});

// ─── Tests: checkCutoverReadiness ─────────────────────────────────────

describe('checkCutoverReadiness', () => {
  beforeEach(() => {
    mockGetDocs.mockReset().mockResolvedValue({ docs: [] });
  });

  it('retorna canCutover=true quando todas as flags e collections estão OK', async () => {
    const allEnabled = {
      'shelter_foundation': true,
      'shelter_animal_unified_profile': true,
      'shelter_pet_timeline': true,
      'shelter_adoption_workflow': true,
      'shelter_adopter_full_profile': true,
      'shelter_post_adoption_followup': true,
      'shelter_foster': true,
      'shelter_health_records': true,
      'shelter_medication': true,
      'shelter_gallery': true,
      'shelter_exhibitions': true,
      'shelter_exhibition_rsvps': true,
      'shelter_exhibition_workflow_v1': true,
      'shelter_volunteers': true,
      'shelter_volunteer_profile_v1': true,
      'shelter_dashboard': true,
      'shelter_kanban': true,
      'shelter_reports': true,
      'shelter_indicators': true,
      'shelter_smart_search': true,
      'shelter_legal_terms': true,
      'shelter_legal_terms_v1': true,
      'shelter_security_hardening': true,
      'shelter_platform_health': true,
      'shelter_cutover': true,
    };

    const result = await checkCutoverReadiness(allEnabled);

    expect(result.canCutover).toBe(true);
    expect(result.status.isReady).toBe(true);
    expect(result.readiness.isAccessible).toBe(true);
    expect(result.messages.some((m) => m.includes('pronto para cutover'))).toBe(true);
  });

  it('retorna canCutover=false quando flags estão faltando', async () => {
    const result = await checkCutoverReadiness({});

    expect(result.canCutover).toBe(false);
    expect(result.status.isReady).toBe(false);
    expect(result.messages.some((m) => m.includes('Faltam'))).toBe(true);
  });

  it('retorna canCutover=false quando collections estão inacessíveis', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Permission denied'));
    const allEnabled = {
      'shelter_foundation': true,
      'shelter_animal_unified_profile': true,
      'shelter_pet_timeline': true,
      'shelter_adoption_workflow': true,
      'shelter_adopter_full_profile': true,
      'shelter_post_adoption_followup': true,
      'shelter_foster': true,
      'shelter_health_records': true,
      'shelter_medication': true,
      'shelter_gallery': true,
      'shelter_exhibitions': true,
      'shelter_exhibition_rsvps': true,
      'shelter_exhibition_workflow_v1': true,
      'shelter_volunteers': true,
      'shelter_volunteer_profile_v1': true,
      'shelter_dashboard': true,
      'shelter_kanban': true,
      'shelter_reports': true,
      'shelter_indicators': true,
      'shelter_smart_search': true,
      'shelter_legal_terms': true,
      'shelter_legal_terms_v1': true,
      'shelter_security_hardening': true,
      'shelter_platform_health': true,
      'shelter_cutover': true,
    };

    const result = await checkCutoverReadiness(allEnabled);

    expect(result.canCutover).toBe(false);
    expect(result.readiness.isAccessible).toBe(false);
  });
});

// ─── Tests: SHELTER_COLLECTIONS e REQUIRED_FLAGS ────────────────────────

describe('SHELTER_COLLECTIONS', () => {
  it('contém todas as collections principais do shelter', () => {
    expect(SHELTER_COLLECTIONS).toContain('pets');
    expect(SHELTER_COLLECTIONS).toContain('clubs');
    expect(SHELTER_COLLECTIONS).toContain('adoption_workflow');
    expect(SHELTER_COLLECTIONS).toContain('exhibitions');
    expect(SHELTER_COLLECTIONS).toContain('volunteer_profiles');
  });

  it('não contém duplicatas', () => {
    const unique = new Set(SHELTER_COLLECTIONS);
    expect(unique.size).toBe(SHELTER_COLLECTIONS.length);
  });
});

describe('REQUIRED_FLAGS_FOR_CUTOVER', () => {
  // shelter_cutover NÃO deve estar na lista - é a flag de gate final
  // que só é ligada depois que todas as outras estão ON
  it('NÃO contém shelter_cutover (é o gate final)', () => {
    expect(REQUIRED_FLAGS_FOR_CUTOVER).not.toContain('shelter_cutover');
  });

  it('contém as principais flags do shelter', () => {
    expect(REQUIRED_FLAGS_FOR_CUTOVER).toContain('shelter_foundation');
    expect(REQUIRED_FLAGS_FOR_CUTOVER).toContain('shelter_dashboard');
    expect(REQUIRED_FLAGS_FOR_CUTOVER).toContain('shelter_kanban');
    expect(REQUIRED_FLAGS_FOR_CUTOVER).toContain('shelter_reports');
    expect(REQUIRED_FLAGS_FOR_CUTOVER).toContain('shelter_indicators');
  });
});
