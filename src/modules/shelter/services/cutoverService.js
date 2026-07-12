/**
 * @fileoverview Serviço: Cutover do Sistema de Gestão do Abrigo (Fase 22).
 *
 * Responsável por:
 *  - `getCutoverStatus()` — retorna status de todas as SHELTER_* flags
 *  - `validateShelterReadiness()` — verifica se as collections estão acessíveis
 *
 * Este serviço é usado para validar o estado de cutover antes de migrar
 * da estrutura antiga de Organizações para o novo modelo de Abrigos.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 */

import { z } from 'zod';
import {
  collectionGroup,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import {
  SHELTER_FEATURE_FLAG,
  DEFAULT_SHELTER_FLAGS,
} from '@/modules/shelter/domain/constants';

/**
 * Coleções do sistema shelter que devem estar acessíveis para cutover.
 */
export const SHELTER_COLLECTIONS = [
  'pets',
  'clubs',
  'adoption_workflow',
  'adopters',
  'volunteer_profiles',
  'exhibitions',
  'fosters',
  'medical_records',
  'medications',
  'timeline_events',
  'gallery_photos',
];

/**
 * Feature flags do shelter que precisam estar ON para cutover completo.
 * A flag SHELTER_CUTOVER deve ser a última a ser ligada.
 */
export const REQUIRED_FLAGS_FOR_CUTOVER = [
  SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION,
  SHELTER_FEATURE_FLAG.SHELTER_ANIMAL_UNIFIED_PROFILE,
  SHELTER_FEATURE_FLAG.SHELTER_PET_TIMELINE,
  SHELTER_FEATURE_FLAG.SHELTER_ADOPTION_WORKFLOW,
  SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_FULL_PROFILE,
  SHELTER_FEATURE_FLAG.SHELTER_POST_ADOPTION_FOLLOWUP,
  SHELTER_FEATURE_FLAG.SHELTER_FOSTER,
  SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS,
  SHELTER_FEATURE_FLAG.SHELTER_MEDICATION,
  SHELTER_FEATURE_FLAG.SHELTER_GALLERY,
  SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS,
  SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_RSVPS,
  SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_WORKFLOW_V1,
  SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS,
  SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1,
  SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD,
  SHELTER_FEATURE_FLAG.SHELTER_KANBAN,
  SHELTER_FEATURE_FLAG.SHELTER_REPORTS,
  SHELTER_FEATURE_FLAG.SHELTER_INDICATORS,
  SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH,
  SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS,
  SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1,
  SHELTER_FEATURE_FLAG.SHELTER_SECURITY_HARDENING,
  SHELTER_FEATURE_FLAG.SHELTER_PLATFORM_HEALTH,
];

/**
 * Estrutura do status retornado por getCutoverStatus.
 * @typedef {Object} CutoverStatus
 * @property {boolean} isReady - Se todas as flags estão ON
 * @property {Object.<string, boolean>} flags - Mapa de flag -> status
 * @property {string[]} missingFlags - Lista de flags que ainda estão OFF
 * @property {number} totalFlags - Total de flags do shelter
 * @property {number} enabledFlags - Número de flags habilitadas
 */

/**
 * Retorna o status de todas as SHELTER_* feature flags.
 *
 * @param {Object.<string, boolean>} currentFlags - Flags atuais (do FeatureFlagsContext)
 * @returns {CutoverStatus}
 */
export function getCutoverStatus(currentFlags = {}) {
  const allFlags = { ...DEFAULT_SHELTER_FLAGS, ...currentFlags };
  const flagKeys = Object.keys(SHELTER_FEATURE_FLAG);

  const flags = {};
  const missingFlags = [];

  for (const key of flagKeys) {
    const flagName = SHELTER_FEATURE_FLAG[key];
    const isEnabled = allFlags[flagName] === true;
    flags[flagName] = isEnabled;
    if (!isEnabled) {
      missingFlags.push(flagName);
    }
  }

  const enabledFlags = flagKeys.filter(
    (key) => allFlags[SHELTER_FEATURE_FLAG[key]] === true
  ).length;

  return {
    isReady: missingFlags.length === 0,
    flags,
    missingFlags,
    totalFlags: flagKeys.length,
    enabledFlags,
  };
}

/**
 * Estrutura do resultado de validateShelterReadiness.
 * @typedef {Object} ShelterReadinessResult
 * @property {boolean} isAccessible - Se todas as collections estão acessíveis
 * @property {Object.<string, boolean>} collections - Mapa de collection -> status
 * @property {string[]} inaccessibleCollections - Collections que não estão acessíveis
 * @property {Error|null} error - Erro se houve falha na verificação
 */

/**
 * Valida se as collections do shelter estão acessíveis para leitura.
 *
 * @returns {Promise<ShelterReadinessResult>}
 */
export async function validateShelterReadiness() {
  const result = {
    isAccessible: true,
    collections: {},
    inaccessibleCollections: [],
    error: null,
  };

  for (const collectionName of SHELTER_COLLECTIONS) {
    try {
      // Faz uma query simples para verificar se a collection é acessível
      const collectionRef = collectionGroup(db, collectionName);
      const q = query(collectionRef, limit(1));
      await getDocs(q);
      result.collections[collectionName] = true;
    } catch (err) {
      result.collections[collectionName] = false;
      result.inaccessibleCollections.push(collectionName);
      result.isAccessible = false;
      result.error = err;
    }
  }

  return result;
}

/**
 * Verifica se o cutover pode ser realizado.
 *
 * @param {Object.<string, boolean>} currentFlags - Flags atuais
 * @returns {Promise<{canCutover: boolean, status: CutoverStatus, readiness: ShelterReadinessResult, messages: string[]}>}
 */

// TASK-012: currentFlags deve ser um mapa nome→boolean. Valores não
// booleanos (ex.: strings 'true' vindas de env) seriam avaliados de
// forma enganosa no getCutoverStatus.
const currentFlagsSchema = z.record(z.string(), z.boolean()).default({});

export async function checkCutoverReadiness(currentFlags = {}) {
  const parsedFlags = currentFlagsSchema.parse(currentFlags ?? {});
  const status = getCutoverStatus(parsedFlags);
  const readiness = await validateShelterReadiness();
  const messages = [];

  // Verificar flags
  if (!status.isReady) {
    messages.push(
      `Faltam ${status.missingFlags.length} feature flags: ${status.missingFlags.join(', ')}`
    );
  } else {
    messages.push('Todas as feature flags estão habilitadas.');
  }

  // Verificar collections
  if (!readiness.isAccessible) {
    messages.push(
      `Collections inacessíveis: ${readiness.inaccessibleCollections.join(', ')}`
    );
  } else {
    messages.push('Todas as collections estão acessíveis.');
  }

  const canCutover = status.isReady && readiness.isAccessible;

  if (canCutover) {
    messages.push('✅ Sistema pronto para cutover!');
  } else {
    messages.push('❌ Sistema NÃO está pronto para cutover.');
  }

  return {
    canCutover,
    status,
    readiness,
    messages,
  };
}

export default {
  getCutoverStatus,
  validateShelterReadiness,
  checkCutoverReadiness,
  SHELTER_COLLECTIONS,
  REQUIRED_FLAGS_FOR_CUTOVER,
};
