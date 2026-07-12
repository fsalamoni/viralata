/**
 * @fileoverview Serviço: Termo de Adesão do Abrigo (Fase 19 / Bloco 5).
 *
 * Persiste o aceite do Termo de Adesão e DPA em
 * `clubs/{clubId}/onboarding/terms_accepted` (doc com id
 * determinista = 'terms_accepted'). Idempotente: a UI pode
 * recarregar o status de aceite sem criar duplicatas.
 *
 * O doc carrega:
 *  - shelter_club_id
 *  - terms_accepted_at (ISO UTC)
 *  - terms_version ('2026-07-10')
 *  - signature_text (nome do representante legal)
 *  - signature_cpf (11 dígitos)
 *  - signature_role (cargo)
 *  - cnpj (14 dígitos, opcional)
 *  - created_at / updated_at (serverTimestamp)
 *
 * O doc é IMUTÁVEL após a primeira gravação (exceto platform_admin).
 * A regra do firestore.rules libera o create para o abrigo owner/
 * admin, e update/delete apenas para platform_admin.
 *
 * LGPD: art. 7º, V (execução de contrato). Lei 14.063/2020:
 * assinatura eletrônica nível básico com CPF para fins de
 * verificação de representação legal.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import { z } from 'zod';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { buildShelterOnboardingAcceptance } from '@/modules/shelter/domain/legal/shelterOnboardingTerms';

const CLUBS_COLLECTION = 'clubs';
const ONBOARDING_SUBCOLLECTION = 'onboarding';
const ACCEPTANCE_DOC_ID = 'terms_accepted';

function onboardingRef(shelterClubId) {
  return doc(
    db,
    CLUBS_COLLECTION,
    shelterClubId,
    ONBOARDING_SUBCOLLECTION,
    ACCEPTANCE_DOC_ID,
  );
}

/**
 * Lê o aceite atual do Termo de Adesão. Retorna null se ainda
 * não foi aceito.
 *
 * @param {string} shelterClubId
 * @returns {Promise<object|null>}
 */
export async function getShelterOnboardingAcceptance(shelterClubId) {
  if (!db || !shelterClubId) return null;
  const snap = await getDoc(onboardingRef(shelterClubId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Grava o aceite do Termo de Adesão. Cria o doc (idempotente:
 * se já existir, lança erro — use {@link reAcceptShelterOnboardingTerms}
 * se for um re-aceite administrativo).
 *
 * @param {string} shelterClubId
 * @param {object} input - {
 *   legal_rep_name, legal_rep_cpf, legal_rep_role, cnpj
 * }
 * @param {object} actor - {uid, displayName}
 */

// TASK-012: validação Zod do input mutável (defesa antes do builder,
// que também valida — Zod dá mensagens estruturadas e trim).
const onboardingInputSchema = z.object({
  legal_rep_name: z.string().trim().min(3, 'Nome do responsável legal deve ter no mínimo 3 caracteres.'),
  legal_rep_cpf: z.string().refine((v) => v.replace(/\D/g, '').length === 11, 'CPF do responsável legal é obrigatório (11 dígitos).'),
  legal_rep_role: z.string().trim().min(2, 'Cargo do responsável legal é obrigatório.'),
  cnpj: z.string().optional().nullable(),
});

export async function acceptShelterOnboardingTerms(shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsedInput = onboardingInputSchema.parse(input ?? {});
  const acceptance = buildShelterOnboardingAcceptance(parsedInput);

  const ref = onboardingRef(shelterClubId);
  const current = await getDoc(ref);
  if (current.exists()) {
    throw new Error(
      'Termo de Adesão já foi aceito. Para atualizar a versão, é necessária aprovação de platform_admin.',
    );
  }

  const doc_data = {
    shelter_club_id: shelterClubId,
    ...acceptance,
    accepted_by_uid: actor.uid,
    accepted_by_name: actor.displayName || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(ref, doc_data);

  await createAuditLog({
    action: 'shelter_onboarding_terms_accepted',
    actor,
    details: {
      shelter_club_id: shelterClubId,
      terms_version: acceptance.terms_version,
      cnpj: acceptance.cnpj,
      signature_role: acceptance.signature_role,
      signature_cpf_hash: hashString(acceptance.signature_cpf),
    },
  }).catch((err) => {
    logger.warn('shelterOnboardingService.acceptShelterOnboardingTerms', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ACCEPTANCE_DOC_ID, ...doc_data };
}

/**
 * Helper: hash simples do CPF para o audit log (LGPD — minimização).
 */
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return `sig_${Math.abs(h).toString(16)}`;
}
