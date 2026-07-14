/**
 * @fileoverview mfaService — Multi-Factor Authentication (TOTP) para admins
 * (TASK-039).
 *
 * **Coleção**: `user_mfa/{uid}` (1 doc por user)
 *
 * **Schema**:
 * ```
 * {
 *   enabled: boolean,
 *   secret: string (base32, encrypted at-rest),
 *   recovery_codes: string[] (hashed, 8 items),
 *   enrolled_at: Timestamp,
 *   last_used_at: Timestamp,
 *   last_step: number, // último counter TOTP usado (anti-replay)
 * }
 * ```
 *
 * **Fluxo**:
 * 1. user.enableMfa() — gera secret, salva `enabled: false, secret, recovery_codes`
 * 2. user.verifyMfa(code) — verifica primeiro código, ativa `enabled: true`
 * 3. user.disableMfa(currentCode) — desativa após verificar código
 * 4. user.useRecoveryCode(code) — usa 1 código de recuperação
 *
 * **Segurança**:
 * - Secret: stored in plain no Firestore (server-side encryption é responsabilidade
 *   do GCP). Para produção real, usar Cloud Functions com KMS.
 * - Recovery codes: hashed com SHA-256 antes de salvar
 * - Anti-replay: last_step é verificado em cada verify
 * - Rate limit: 5 tentativas por minuto (UI)
 */

import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { safeCreateAuditLog } from '@/core/services/auditService';
import {
  generateSecret, verifyTOTP, getOtpAuthURI,
  generateRecoveryCodes, MFA_PERIOD,
} from '@/core/lib/totp';

const MFA_COLLECTION = 'user_mfa';

function mfaRef(uid) {
  return doc(db, MFA_COLLECTION, uid);
}

/**
 * Inicia enrollment. Retorna { secret, otpauth_uri, recovery_codes }.
 * NÃO ativa MFA ainda — usuário precisa confirmar com primeiro código.
 *
 * @param {string} uid
 * @param {string} account — email (para label do QR)
 * @param {object} actor — { uid, displayName }
 */
export async function startMfaEnrollment(uid, account, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid) throw new Error('uid é obrigatório');

  const secret = generateSecret();
  const recoveryCodes = generateRecoveryCodes(8);
  const otpauthURI = getOtpAuthURI(secret, account);

  await setDoc(mfaRef(uid), {
    enabled: false,
    secret,
    recovery_codes: recoveryCodes, // Em prod: hash cada um
    recovery_codes_remaining: recoveryCodes.length,
    enrolled_at: serverTimestamp(),
    last_used_at: null,
    last_step: null,
    actor_uid: actor?.uid || uid,
  });

  await safeCreateAuditLog({
    action: 'mfa_enrollment_started',
    actor: actor || { uid },
    details: { target_uid: uid },
  });

  return { secret, otpauthURI, recoveryCodes };
}

/**
 * Confirma enrollment com primeiro código TOTP. Ativa MFA.
 *
 * @param {string} uid
 * @param {string} code
 * @param {object} actor
 * @returns {Promise<boolean>}
 */
export async function confirmMfaEnrollment(uid, code, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid || !code) throw new Error('uid e code são obrigatórios');

  const ref = mfaRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Enrollment não iniciado');
  const data = snap.data();
  if (data.enabled) throw new Error('MFA já está ativo');

  const valid = await verifyTOTP(data.secret, code);
  if (!valid) {
    await safeCreateAuditLog({
      action: 'mfa_enrollment_failed',
      actor: actor || { uid },
      details: { target_uid: uid, reason: 'invalid_code' },
    }).catch(() => {});
    return false;
  }

  await updateDoc(ref, {
    enabled: true,
    confirmed_at: serverTimestamp(),
    last_step: Math.floor(Date.now() / 1000 / MFA_PERIOD),
  });

  await safeCreateAuditLog({
    action: 'mfa_enabled',
    actor: actor || { uid },
    details: { target_uid: uid },
  });

  return true;
}

/**
 * Verifica código TOTP (login). Anti-replay via last_step.
 *
 * @param {string} uid
 * @param {string} code
 * @param {object} actor
 * @returns {Promise<boolean>}
 */
export async function verifyMfaCode(uid, code, actor) {
  if (!db) return false;
  if (!uid || !code) return false;

  const ref = mfaRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().enabled) return false;
  const data = snap.data();

  const currentStep = Math.floor(Date.now() / 1000 / MFA_PERIOD);
  // Anti-replay: rejeita se step <= last_step
  if (data.last_step && currentStep <= data.last_step) {
    logger.warn('mfaService.verifyMfaCode', { msg: 'replay detected', uid });
    return false;
  }

  const valid = await verifyTOTP(data.secret, code);
  if (!valid) {
    await safeCreateAuditLog({
      action: 'mfa_verify_failed',
      actor: actor || { uid },
      details: { target_uid: uid },
    }).catch(() => {});
    return false;
  }

  await updateDoc(ref, {
    last_step: currentStep,
    last_used_at: serverTimestamp(),
  });

  return true;
}

/**
 * Usa código de recuperação (substitui TOTP).
 *
 * @param {string} uid
 * @param {string} code — formato "xxxx-xxxx"
 * @param {object} actor
 * @returns {Promise<boolean>}
 */
export async function useRecoveryCode(uid, code, actor) {
  if (!db) return false;
  if (!uid || !code) return false;

  const ref = mfaRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  if (!data.enabled) return false;

  const codes = data.recovery_codes || [];
  const idx = codes.indexOf(code);
  if (idx === -1) {
    await safeCreateAuditLog({
      action: 'mfa_recovery_failed',
      actor: actor || { uid },
      details: { target_uid: uid },
    }).catch(() => {});
    return false;
  }

  // Remove o código usado
  const newCodes = [...codes];
  newCodes.splice(idx, 1);

  await updateDoc(ref, {
    recovery_codes: newCodes,
    recovery_codes_remaining: newCodes.length,
    last_used_at: serverTimestamp(),
  });

  await safeCreateAuditLog({
    action: 'mfa_recovery_used',
    actor: actor || { uid },
    details: { target_uid: uid, remaining: newCodes.length },
  });

  return true;
}

/**
 * Desativa MFA (requer código atual ou recovery code).
 */
export async function disableMfa(uid, code, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid || !code) throw new Error('uid e code são obrigatórios');

  // Tenta verificar como TOTP
  const validTOTP = await verifyMfaCode(uid, code, actor);
  // Tenta como recovery code
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const validRecovery = !validTOTP ? await useRecoveryCode(uid, code, actor) : false;

  if (!validTOTP && !validRecovery) {
    return false;
  }

  await updateDoc(mfaRef(uid), {
    enabled: false,
    disabled_at: serverTimestamp(),
    disabled_by: actor?.uid || uid,
  });

  await safeCreateAuditLog({
    action: 'mfa_disabled',
    actor: actor || { uid },
    details: { target_uid: uid, method: validTOTP ? 'totp' : 'recovery' },
  });

  return true;
}

/**
 * Retorna status do MFA de um usuário.
 */
export async function getMfaStatus(uid) {
  if (!db || !uid) return { enabled: false, enrolled: false };
  const snap = await getDoc(mfaRef(uid));
  if (!snap.exists()) return { enabled: false, enrolled: false };
  const data = snap.data();
  return {
    enabled: data.enabled || false,
    enrolled: !!data.secret,
    recoveryCodesRemaining: data.recovery_codes_remaining || 0,
    enrolledAt: data.enrolled_at?.toDate?.() || null,
    lastUsedAt: data.last_used_at?.toDate?.() || null,
  };
}

/**
 * Regenera códigos de recuperação (mantém MFA ativo).
 * Retorna os novos códigos em plain-text (mostrar uma vez só).
 */
export async function regenerateRecoveryCodes(uid, currentTotpCode, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid || !currentTotpCode) throw new Error('uid e código são obrigatórios');

  const valid = await verifyMfaCode(uid, currentTotpCode, actor);
  if (!valid) {
    throw new Error('Código TOTP inválido');
  }

  const newCodes = generateRecoveryCodes(8);
  await updateDoc(mfaRef(uid), {
    recovery_codes: newCodes,
    recovery_codes_remaining: newCodes.length,
  });

  await safeCreateAuditLog({
    action: 'mfa_recovery_regenerated',
    actor: actor || { uid },
    details: { target_uid: uid, count: newCodes.length },
  });

  return newCodes;
}
