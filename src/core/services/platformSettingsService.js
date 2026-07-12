/**
 * Configurações globais da plataforma (documento único `platform_settings/global`).
 *
 * Guarda feature flags, textos, rótulos e limites operacionais auditáveis,
 * sempre com fallback seguro para os padrões locais.
 */

import { doc, getDoc, getDocs, onSnapshot, setDoc, serverTimestamp, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import {
  PLATFORM_SETTINGS_DEFAULTS,
  normalizePlatformSettings,
} from '@/core/platformSettings';
import {
  FEATURE_FLAG,
} from '@/core/featureFlags';

const COL = 'platform_settings';
const DOC_ID = 'global';

function settingsRef() {
  return doc(db, COL, DOC_ID);
}

/**
 * Lê (uma vez) as configurações da plataforma. Nunca lança: na ausência do
 * documento ou em erro de permissão, devolve os padrões (todas as flags off).
 * @returns {Promise<ReturnType<typeof normalizePlatformSettings>>}
 */
export async function getPlatformSettings() {
  try {
    if (!db) return normalizePlatformSettings(PLATFORM_SETTINGS_DEFAULTS);
    const snap = await getDoc(settingsRef());
    return normalizePlatformSettings(snap.exists() ? snap.data() : null);
  } catch {
    return normalizePlatformSettings(PLATFORM_SETTINGS_DEFAULTS);
  }
}

/**
 * Observa as configurações em tempo real. Retorna a função de unsubscribe.
 * Em qualquer erro, entrega os padrões e segue (sem quebrar a aplicação).
 * @param {(settings: ReturnType<typeof normalizePlatformSettings>) => void} cb
 * @returns {() => void}
 */
export function subscribePlatformSettings(cb) {
  if (!db) {
    cb(normalizePlatformSettings(PLATFORM_SETTINGS_DEFAULTS));
    return () => {};
  }
  try {
    return onSnapshot(
      settingsRef(),
      (snap) => {
        cb(normalizePlatformSettings(snap.exists() ? snap.data() : null));
      },
      () => cb(normalizePlatformSettings(PLATFORM_SETTINGS_DEFAULTS)),
    );
  } catch {
    cb(normalizePlatformSettings(PLATFORM_SETTINGS_DEFAULTS));
    return () => {};
  }
}

/**
 * Liga/desliga uma feature flag. Faz merge para não tocar em outras chaves.
 * Apenas admin master deve chamar (as regras do Firestore reforçam isso).
 * @param {string} flagKey
 * @param {boolean} enabled
 * @param {object} actor — usuário autenticado (para auditoria)
 */
/**
 * Versão da migração de flags. Mantida sincronizada com
 * `FeatureFlagsContext.migrateLegacyFlags`. Aumentar quando a lógica de
 * upgrade mudar.
 */
export const FLAGS_MIGRATION_VERSION = 2;

/**
 * Marca a migração de flags como aplicada no doc `platform_settings/global`.
 * Chamada automaticamente pelo AdminFlags (uma vez por sessão, no mount)
 * e por setFeatureFlag. Idempotente.
 */
export async function markFlagsMigrationApplied(actor = null) {
  try {
    await setDoc(
      settingsRef(),
      {
        _migrations: { flags: FLAGS_MIGRATION_VERSION },
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
    if (actor) {
      await createAuditLog({
        action: 'platform_flags_migration_acknowledged',
        actor,
        details: { version: FLAGS_MIGRATION_VERSION },
      });
    }
  } catch (err) {
    // Não-bloqueante: a migração client-side continua aplicando defaults
    // a cada load até o marker conseguir ser gravado.
    console.warn('[platform] markFlagsMigrationApplied failed:', err?.message);
  }
}

export async function setFeatureFlag(flagKey, enabled, actor, reason = null) {
  if (!Object.values(FEATURE_FLAG).includes(flagKey)) {
    throw new Error(`Feature flag desconhecida: ${flagKey}`);
  }
  // TASK-167: captura o valor anterior para a trilha from→to.
  const current = await getPlatformSettings().catch(() => null);
  const fromValue = current?.feature_flags?.[flagKey] ?? null;
  await setDoc(
    settingsRef(),
    {
      feature_flags: { [flagKey]: Boolean(enabled) },
      _migrations: { flags: FLAGS_MIGRATION_VERSION },
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
  await createAuditLog({
    action: 'platform_feature_flag_changed',
    actor,
    details: {
      flag: flagKey,
      enabled: Boolean(enabled),
      from_value: fromValue,
      to_value: Boolean(enabled),
      reason: reason || null,
    },
  });
}

const SETTINGS_SECTIONS = ['ui_labels', 'ui_text', 'operational_limits'];

export async function updatePlatformSettingsSection(section, value, actor) {
  if (!SETTINGS_SECTIONS.includes(section)) {
    throw new Error(`Seção de configuração desconhecida: ${section}`);
  }
  const normalized = normalizePlatformSettings({ [section]: value });
  await setDoc(
    settingsRef(),
    {
      [section]: normalized[section],
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
  await createAuditLog({
    action: 'platform_settings_updated',
    actor,
    details: {
      section,
      keys: Object.keys(normalized[section]),
    },
  });
  return normalized[section];
}

/**
 * TASK-167: histórico de mudanças de feature flags (quem, quando,
 * de→para, motivo). Lê audit_logs filtrado pela action. Requer
 * platform_admin (rules do audit_logs já restringem leitura).
 */
export async function listFeatureFlagHistory(maxResults = 20) {
  if (!db) return [];
  const q = query(
    collection(db, 'audit_logs'),
    where('action', '==', 'platform_feature_flag_changed'),
    orderBy('created_at_ms', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
