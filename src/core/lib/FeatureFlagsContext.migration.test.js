/**
 * @fileoverview Testes para a migração client-side de feature flags.
 *
 * A migração resolve o cenário legado: o doc `platform_settings/global` foi
 * criado com todas as flags em false (default antigo). Quando os defaults
 * locais mudaram (PR #26 — UX flags ON), o doc persistido continuou
 * segurando false, e o `normalizeFeatureFlags` preserva o false. Resultado:
 * as features não funcionam para o admin que nunca visitou /admin/flags.
 *
 * A função `migrateLegacyFlags` detecta o estado legado e força os defaults
 * atuais — mas só se TODAS as flags estiverem em false (para não sobrescrever
 * o admin que explicitamente desligou uma flag específica).
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG } from '@/core/featureFlags';
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