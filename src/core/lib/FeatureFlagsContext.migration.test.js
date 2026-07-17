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
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG } from '@/core/featureFlags';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { migrateLegacyFlagsForTest } from '@/core/lib/FeatureFlagsContext.migration';

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

  it('NÃO sobrescreve SHELTER_* explicitamente em false (admin desligou)', () => {
    const stored = {
      ...DEFAULT_FEATURE_FLAGS,
      [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: true,
      [SHELTER_FEATURE_FLAG.SHELTER_FOSTER]: false,
    };
    const migrated = migrateLegacyFlagsForTest(stored);
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
  it('FLAGS_MIGRATION_VERSION is 4 after the TASK-815 fix', async () => {
    const { FLAGS_MIGRATION_VERSION } = await import('@/core/services/platformSettingsService');
    expect(FLAGS_MIGRATION_VERSION).toBe(4);
  });
});
