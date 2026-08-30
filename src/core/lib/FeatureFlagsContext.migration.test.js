/**
 * @fileoverview Testes para a migração client-side de feature flags.
 *
 * A migração resolve o cenário legado: o doc `platform_settings/global` foi
 * criado com todas as flags em false (default antigo). Quando os defaults
 * locais mudaram (PR #26 — UX flags ON, depois SHELTER_* ON), o doc
 * persistido continuou segurando false. Sem a migração, mudar
 * DEFAULT_FEATURE_FLAGS localmente não afeta quem já tem o doc persistido.
 *
 * A função `migrateLegacyFlags` detecta o estado legado e força os defaults
 * atuais. Migração v3 (2026-07-16) tem DOIS critérios:
 *  1. TODAS as flags em false → migra tudo.
 *  2. Caso contrário → migra apenas SHELTER_* que estão undefined/null
 *     (preserva controle explícito do admin sobre outras flags).
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG, NEWEST_VERSION_CUTOVER_FLAGS } from '@/core/featureFlags';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { migrateLegacyFlagsForTest, CUTOVER_NEWEST_VERSION } from '@/core/lib/FeatureFlagsContext.migration';

describe('migrateLegacyFlags — detecção de estado legado', () => {
  it('migra quando TODAS as flags estão em false (estado legado)', () => {
    const allFalse = Object.fromEntries(Object.values(FEATURE_FLAG).map((k) => [k, false]));
    const migrated = migrateLegacyFlagsForTest(allFalse);
    // Após migração, deve usar os defaults atuais (UX flags ON).
    expect(migrated).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('migra quando o doc não tem feature_flags (legado sem chave)', () => {
    const migrated = migrateLegacyFlagsForTest(undefined);
    expect(migrated).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('NÃO migra quando apenas uma flag está em false (admin desligou explicitamente)', () => {
    const partial = { ...DEFAULT_FEATURE_FLAGS };
    partial[FEATURE_FLAG.AD_SLOTS] = false; // única OFF — admin toggle
    const migrated = migrateLegacyFlagsForTest(partial);
    expect(migrated).toEqual(partial);
    expect(migrated[FEATURE_FLAG.MURAL_RICH_POSTS]).toBe(true);
    expect(migrated[FEATURE_FLAG.AD_SLOTS]).toBe(false);
  });

  it('NÃO migra quando as flags UX estão todas ON (estado normal pós-deploy)', () => {
    const migrated = migrateLegacyFlagsForTest(DEFAULT_FEATURE_FLAGS);
    expect(migrated).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('NÃO migra quando há mistura ON/OFF sem padrão legado', () => {
    const mixed = {
      ...DEFAULT_FEATURE_FLAGS,
      [FEATURE_FLAG.MURAL_RICH_POSTS]: false,
      [FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS]: false,
    };
    const migrated = migrateLegacyFlagsForTest(mixed);
    expect(migrated).toEqual(mixed);
  });

  it('preserva chaves extras que não conhece (forward-compat)', () => {
    const allFalse = Object.fromEntries(Object.values(FEATURE_FLAG).map((k) => [k, false]));
    const withExtra = { ...allFalse, custom_key: 'something' };
    const migrated = migrateLegacyFlagsForTest(withExtra);
    expect(migrated.custom_key).toBe('something');
    expect(migrated[FEATURE_FLAG.MURAL_RICH_POSTS]).toBe(DEFAULT_FEATURE_FLAGS[FEATURE_FLAG.MURAL_RICH_POSTS]);
  });
});

describe('migrateLegacyFlags — migração v3 (SHELTER_* parciais)', () => {
  it('migra apenas SHELTER_* que estão undefined, preservando as explicitamente setadas', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: true,
      [SHELTER_FEATURE_FLAG.SHELTER_KANBAN]: true,
      [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: true,
    };
    const migrated = migrateLegacyFlagsForTest(stored);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_KANBAN]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]).toBe(true);
    const defFoster = DEFAULT_FEATURE_FLAGS[SHELTER_FEATURE_FLAG.SHELTER_FOSTER];
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_FOSTER]).toBe(defFoster);
    const defReports = DEFAULT_FEATURE_FLAGS[SHELTER_FEATURE_FLAG.SHELTER_REPORTS];
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_REPORTS]).toBe(defReports);
  });

  it('NÃO sobrescreve SHELTER_* explicitamente em false após o cutover (admin desligou; appliedVersion >= CUTOVER_NEWEST_VERSION)', () => {
    // Depois que o cutover 2026-08-30 foi aplicado e persistido, o admin
    // recupera o controle: uma flag SHELTER_* que ele desligou permanece
    // desligada (Critério 2 só preenche undefined/null; o force do Critério 3
    // não roda mais para versões >= CUTOVER_NEWEST_VERSION).
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: true,
      [SHELTER_FEATURE_FLAG.SHELTER_FOSTER]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored, CUTOVER_NEWEST_VERSION);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_FOSTER]).toBe(false);
  });

  it('NÃO toca em flags não-SHELTER (preserva controle explícito)', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [FEATURE_FLAG.HOME_STATS_V1]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored);
    expect(migrated[FEATURE_FLAG.HOME_STATS_V1]).toBe(false);
  });

  it('retorna a mesma estrutura se não há SHELTER_* para migrar', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: true,
      [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: true,
    };
    const migrated = migrateLegacyFlagsForTest(stored);
    expect(migrated).toEqual(stored);
  });
});

describe('TASK-815 — migratedFlagsRef export', () => {
  it('FeatureFlagsContext exports migratedFlagsRef as a shared ref', async () => {
    const { migratedFlagsRef } = await import('@/core/lib/FeatureFlagsContext');
    expect(migratedFlagsRef).toBeDefined();
    expect(typeof migratedFlagsRef).toBe('object');
    expect('current' in migratedFlagsRef).toBe(true);
  });
});

describe('TASK-815 — FLAGS_MIGRATION_VERSION bump', () => {
  it('FLAGS_MIGRATION_VERSION is 6 after the 2026-08-30 cutover (forces newest-version flags ON once)', async () => {
    const { FLAGS_MIGRATION_VERSION } = await import('@/core/services/platformSettingsService');
    expect(FLAGS_MIGRATION_VERSION).toBe(6);
  });
});

describe('CUTOVER 2026-08-30 — Critério 3 (força a versão mais nova ON uma vez)', () => {
  it('força flags do cutover explicitamente em false → true quando appliedVersion < CUTOVER_NEWEST_VERSION', () => {
    // Cenário real: conta que já visitou /admin/flags tem o mapa COMPLETO
    // persistido, inclusive as flags da versão nova em false.
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [FEATURE_FLAG.V3_PAGE_ORG_ADMIN]: false,
      [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: false,
      [SHELTER_FEATURE_FLAG.SHELTER_STORE_V2]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored, CUTOVER_NEWEST_VERSION - 1);
    expect(migrated[FEATURE_FLAG.V3_PAGE_ORG_ADMIN]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_STORE_V2]).toBe(true);
    // Todas as flags do cutover terminam em true.
    for (const k of NEWEST_VERSION_CUTOVER_FLAGS) {
      expect(migrated[k]).toBe(true);
    }
  });

  it('NÃO força (respeita o admin) quando appliedVersion >= CUTOVER_NEWEST_VERSION', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [FEATURE_FLAG.V3_PAGE_ORG_ADMIN]: false,
      [SHELTER_FEATURE_FLAG.SHELTER_STORE_V2]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored, CUTOVER_NEWEST_VERSION);
    expect(migrated[FEATURE_FLAG.V3_PAGE_ORG_ADMIN]).toBe(false);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_STORE_V2]).toBe(false);
  });

  it('não altera flags fora da lista do cutover (ex.: shelter_cutover permanece false)', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_CUTOVER]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored, 0);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_CUTOVER]).toBe(false);
    expect(NEWEST_VERSION_CUTOVER_FLAGS).not.toContain(SHELTER_FEATURE_FLAG.SHELTER_CUTOVER);
  });

  it('inclui as abas antigas do abrigo (SHELTER_DASHBOARD/KANBAN/FOSTER/FINANCE) e as páginas V3 no cutover', () => {
    // Regressão: contas com estas flags antigas persistidas em false também
    // precisam recebê-las de volta no cutover (não só as features novas).
    for (const k of [
      SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD,
      SHELTER_FEATURE_FLAG.SHELTER_KANBAN,
      SHELTER_FEATURE_FLAG.SHELTER_FOSTER,
      SHELTER_FEATURE_FLAG.SHELTER_FINANCE,
      SHELTER_FEATURE_FLAG.SHELTER_ADMIN_DASHBOARD_V1,
    ]) {
      expect(NEWEST_VERSION_CUTOVER_FLAGS).toContain(k);
    }
    expect(NEWEST_VERSION_CUTOVER_FLAGS).toContain(FEATURE_FLAG.V3_PAGE_ORG_ADMIN);
    expect(NEWEST_VERSION_CUTOVER_FLAGS).toContain(FEATURE_FLAG.V3_PAGE_HOME);
    // Um doc com todas essas antigas em false → cutover devolve todas true.
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: false,
      [SHELTER_FEATURE_FLAG.SHELTER_KANBAN]: false,
      [SHELTER_FEATURE_FLAG.SHELTER_FINANCE]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored, CUTOVER_NEWEST_VERSION - 1);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_KANBAN]).toBe(true);
    expect(migrated[SHELTER_FEATURE_FLAG.SHELTER_FINANCE]).toBe(true);
  });

  it('appliedVersion ausente (undefined) trata como 0 → cutover aplica', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [FEATURE_FLAG.V3_PAGE_HOME]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored);
    expect(migrated[FEATURE_FLAG.V3_PAGE_HOME]).toBe(true);
  });
});
