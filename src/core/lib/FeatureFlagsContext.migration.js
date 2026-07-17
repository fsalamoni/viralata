/**
 * @fileoverview Lógica de migração de feature flags — extraída do
 * `FeatureFlagsContext.jsx` para ser testada isoladamente.
 *
 * Resolve o cenário legado: o doc `platform_settings/global` foi criado
 * quando o default era "todas OFF". Os defaults locais mudaram (PR #26 —
 * UX flags viraram ON, depois as SHELTER_* foram ativadas por tarefa),
 * mas o doc persistido continua com flags em false. Sem esta migração,
 * mudar DEFAULT_FEATURE_FLAGS localmente não afeta quem já tem o doc
 * persistido.
 *
 * Migração v4 (2026-07-17, TASK-815): dois critérios (mesma lógica da v3).
 *  1. Se TODAS as flags estão em false → migra tudo (caso legado puro).
 *  2. Caso contrário → migra APENAS as flags SHELTER_* que ainda não
 *     foram explicitamente setadas (preserva controle explícito do admin
 *     sobre outras flags, mas aplica defaults novos das SHELTER_*).
 *     Uma flag é considerada "explicitamente setada" se o valor salvo
 *     for estritamente true ou false. Se for undefined/null, o default
 *     é aplicado.
 *
 * NOTA: esta lógica agora é PERSISTIDA no Firestore via markFlagsMigrationApplied
 * (FLAGS_MIGRATION_VERSION = 4) quando o admin visita /admin/flags. Antes,
 * os valores migrados ficavam apenas em memória e eram sobrepostos pelos
 * valores estocados do Firestore após limpeza de cache.
 */
import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG,
} from '@/core/featureFlags';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

export function migrateLegacyFlagsForTest(rawFlags) {
  return migrateLegacyFlags(rawFlags);
}

export function migrateLegacyFlags(rawFlags) {
  const allFlagKeys = Object.values(FEATURE_FLAG);
  const stored = rawFlags || {};

  // Critério 1: todas as flags em false (incluindo undefined) → migra tudo.
  // BUG FIX: stored[k] === false retorna false para undefined (key not in stored),
  // fazendo storedAllFalse = false quando stored = {}. Corrigido: usar !(k in stored)
  // para detectar keys ausentes (equivalentes a false).
  const storedAllFalse = allFlagKeys.every((k) => !(k in stored) || stored[k] === false);
  if (storedAllFalse) {
    return { ...stored, ...DEFAULT_FEATURE_FLAGS };
  }

  // Critério 2: migra apenas SHELTER_* que não foram explicitamente setadas.
  const shelterKeys = Object.values(SHELTER_FEATURE_FLAG || {});
  const merged = { ...stored };
  let changed = false;
  for (const k of shelterKeys) {
    if (merged[k] === undefined || merged[k] === null) {
      const def = DEFAULT_FEATURE_FLAGS[k];
      if (def !== undefined) {
        merged[k] = def;
        changed = true;
      }
    }
  }
  return changed ? merged : stored;
}