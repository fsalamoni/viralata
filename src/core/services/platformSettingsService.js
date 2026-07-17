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
export const FLAGS_MIGRATION_VERSION = 4; // Bumped to 4 (2026-07-17) — now persists migrated flags to Firestore so they survive cache clear. Previously wrote only the marker (_migrations.flags) but not the corrected feature_flags values, so after cache clear the stale Firestore values would be re-loaded and overlaid over DEFAULT_FEATURE_FLAGS.

/**
 * Marca a migração de flags como aplicada no doc `platform_settings/global`.
 * Chamada automaticamente pelo AdminFlags (uma vez por sessão, no mount)
 * e por setFeatureFlag. Idempotente.
 *
 * TASK-815 FIX: agora também persiste os valores migrados no Firestore.
 * Antes, só escrevia o marker (_migrations.flags = N) mas não as
 * feature_flags corrigidas. Resultado: após limpar cache, os valores
 * estocados eram recarregados do Firestore (ainda antigos) e sobrepostos
 * sobre DEFAULT_FEATURE_FLAGS, fazendo com que flags corrigidas em memória
 * não persistissem entre sessões.
 *
 * @param {object|null} actor — usuário autenticado (para auditoria)
 * @param {object|null} migratedFlags — valores migrados a persistir no Firestore
 *                                    (lidos de migratedFlagsRef em FeatureFlagsContext)
 */
export async function markFlagsMigrationApplied(actor = null, migratedFlags = null) {
  try {
    const writeData = {
      _migrations: { flags: FLAGS_MIGRATION_VERSION },
      updated_at: serverTimestamp(),
    };
    // TASK-815: persiste os flags migrados para que sobrevivam à limpeza de cache.
    // mergedFlags pode vir de migratedFlagsRef (AdminFlags) ou ser null em
    // contextos não-admin onde a escrita Firestore não é necessária.
    if (migratedFlags && typeof migratedFlags === 'object') {
      writeData.feature_flags = { ...migratedFlags };
    }
    await setDoc(settingsRef(), writeData, { merge: true });
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
  try {
    await setDoc(
      settingsRef(),
      {
        feature_flags: { [flagKey]: Boolean(enabled) },
        _migrations: { flags: FLAGS_MIGRATION_VERSION },
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    throw new Error(`Falha ao salvar feature flag '${flagKey}': ${err?.message}`);
  }
  try {
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
  } catch (auditErr) {
    // Não-bloqueante: flag foi salva; auditoria pode ser re-tentada.
    console.warn('[platform] createAuditLog failed after setFeatureFlag:', auditErr?.message);
  }
}

const SETTINGS_SECTIONS = ['ui_labels', 'ui_text', 'operational_limits'];

export async function updatePlatformSettingsSection(section, value, actor) {
  if (!SETTINGS_SECTIONS.includes(section)) {
    throw new Error(`Seção de configuração desconhecida: ${section}`);
  }
  const normalized = normalizePlatformSettings({ [section]: value });
  try {
    await setDoc(
      settingsRef(),
      {
        [section]: normalized[section],
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    throw new Error(`Falha ao atualizar seção '${section}': ${err?.message}`);
  }
  try {
    await createAuditLog({
      action: 'platform_settings_updated',
      actor,
      details: {
        section,
        keys: Object.keys(normalized[section]),
      },
    });
  } catch (auditErr) {
    // Não-bloqueante: seção foi salva; auditoria pode ser re-tentada.
    console.warn('[platform] createAuditLog failed after updatePlatformSettingsSection:', auditErr?.message);
  }
  return normalized[section];
}

/**
 * TASK-167: histórico de mudanças de feature flags (quem, quando,
 * de→para, motivo). Lê audit_logs filtrado pela action. Requer
 * platform_admin (rules do audit_logs já restringem leitura).
 */
export async function listFeatureFlagHistory(maxResults = 20) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('action', '==', 'platform_feature_flag_changed'),
      orderBy('created_at_ms', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}
