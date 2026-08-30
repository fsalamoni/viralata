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
  NEWEST_VERSION_CUTOVER_FLAGS,
} from '@/core/featureFlags';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

/**
 * Versão da migração a partir da qual o CUTOVER da "versão mais nova"
 * (páginas V3 + fundação/features novas do abrigo) já foi aplicado.
 *
 * Se o doc persistido tem `_migrations.flags < CUTOVER_NEWEST_VERSION`, a
 * migração força `NEWEST_VERSION_CUTOVER_FLAGS` para `true` UMA vez. Assim
 * que o admin visita `/admin/flags`, `markFlagsMigrationApplied` persiste
 * `_migrations.flags = FLAGS_MIGRATION_VERSION` (>= este valor) e o force
 * para de acontecer — devolvendo o controle total ao admin.
 *
 * IMPORTANTE: este número é FIXO em 6. Bumps futuros de FLAGS_MIGRATION_VERSION
 * (7, 8, …) NÃO devem re-disparar o cutover — por isso o gate compara com
 * esta constante dedicada, e não com FLAGS_MIGRATION_VERSION.
 */
export const CUTOVER_NEWEST_VERSION = 6;

export function migrateLegacyFlagsForTest(rawFlags, appliedVersion) {
  return migrateLegacyFlags(rawFlags, appliedVersion);
}

export function migrateLegacyFlags(rawFlags, appliedVersion = 0) {
  const allFlagKeys = Object.values(FEATURE_FLAG);
  const stored = rawFlags || {};

  // Critério 1: todas as flags em false (incluindo undefined) → migra tudo.
  // BUG FIX: stored[k] === false retorna false para undefined (key not in stored),
  // fazendo storedAllFalse = false quando stored = {}. Corrigido: usar !(k in stored)
  // para detectar keys ausentes (equivalentes a false).
  const storedAllFalse = allFlagKeys.every((k) => !(k in stored) || stored[k] === false);
  let result = stored;
  let changed = false;

  if (storedAllFalse) {
    result = { ...stored, ...DEFAULT_FEATURE_FLAGS };
    changed = true;
  } else {
    // Critério 2: migra apenas SHELTER_* que não foram explicitamente setadas.
    const shelterKeys = Object.values(SHELTER_FEATURE_FLAG || {});
    const merged = { ...stored };
    for (const k of shelterKeys) {
      if (merged[k] === undefined || merged[k] === null) {
        const def = DEFAULT_FEATURE_FLAGS[k];
        if (def !== undefined) {
          merged[k] = def;
          changed = true;
        }
      }
    }
    if (changed) result = merged;
  }

  // Critério 3 (CUTOVER 2026-08-30): força a "versão mais nova" ON uma única
  // vez. Necessário porque contas que já usaram /admin/flags têm o mapa
  // COMPLETO persistido (inclusive estas flags em false), e o valor
  // persistido vence o default local. Gate por versão: só aplica enquanto a
  // migração persistida for anterior ao cutover. Depois, o admin recupera o
  // controle total (pode desligar qualquer uma). Não toca em flags fora da
  // lista (ex.: shelter_cutover, V4 Personas, flags antigas do abrigo).
  if ((appliedVersion || 0) < CUTOVER_NEWEST_VERSION) {
    const base = result === stored ? { ...stored } : result;
    let cutoverChanged = false;
    for (const k of NEWEST_VERSION_CUTOVER_FLAGS) {
      if (base[k] !== true) {
        base[k] = true;
        cutoverChanged = true;
      }
    }
    if (cutoverChanged) {
      result = base;
      changed = true;
    }
  }

  return changed ? result : stored;
}