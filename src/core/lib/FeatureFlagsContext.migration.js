/**
 * @fileoverview Lógica de migração de feature flags — extraída do
 * `FeatureFlagsContext.jsx` para ser testada isoladamente.
 *
 * Resolve o cenário legado: o doc `platform_settings/global` foi criado
 * quando o default era "todas OFF". Os defaults locais mudaram (PR #26 —
 * UX flags viraram ON), mas o doc persistido continua com todas as flags
 * em false. Sem esta migração, mudar DEFAULT_FEATURE_FLAGS localmente
 * não afeta quem já tem o doc persistido.
 *
 * Critério conservador: só migra se TODAS as flags conhecidas estão em
 * false. Se o admin desligou UMA flag específica (uma só OFF, as outras
 * ON), NÃO toca — controle explícito é preservado.
 */
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG } from '@/core/featureFlags';

export function migrateLegacyFlagsForTest(rawFlags) {
  return migrateLegacyFlags(rawFlags);
}

function migrateLegacyFlags(rawFlags) {
  const allFlagKeys = Object.values(FEATURE_FLAG);
  const storedAllFalse = allFlagKeys.every((k) => !rawFlags || rawFlags[k] === false);
  if (!storedAllFalse) return rawFlags;
  return { ...(rawFlags || {}), ...DEFAULT_FEATURE_FLAGS };
}