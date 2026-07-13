/**
 * @fileoverview Schema Zod para contracts (TASK-288).
 *
 * Schema canônico de um contrato de adoção. Usado por:
 *  - `services/contractsService.js` (validação no service)
 *  - `firestore.rules` (validação de tipos — espelhada em allow create/update)
 *  - `storage.rules` (path do PDF)
 *
 * **Coleção**: `clubs/{clubId}/contracts/{contractId}`
 *
 * **Campos**:
 *  - `application_id` (string, FK para adoption_workflow)
 *  - `pet_id` (string)
 *  - `adopter_uid` (string, FK para users)
 *  - `adopter_signature_text` (string, ex: "Maria da Silva")
 *  - `adopter_signed_at` (ISO 8601)
 *  - `adopter_ip` (string, opcional — coletado server-side via Cloud Function)
 *  - `adopter_user_agent` (string, opcional)
 *  - `shelter_club_id` (string, denormalizado)
 *  - `shelter_representative_uid` (string)
 *  - `shelter_representative_name` (string, ex: "João (Presidente)")
 *  - `shelter_signed_at` (ISO 8601)
 *  - `shelter_signature_text` (string)
 *  - `document_hash` (string SHA-256 hex)
 *  - `document_version` (string, ex: "adoption-terms-v1")
 *  - `pdf_storage_path` (string, ex: "clubs/{clubId}/contracts/{contractId}.pdf")
 *  - `pdf_size_bytes` (number)
 *  - `status` (enum: 'pending_shelter_signature' | 'fully_signed' | 'cancelled')
 *  - `created_at` (ISO 8601)
 *  - `updated_at` (ISO 8601)
 */
import { z } from 'zod';

/** Status possíveis do contrato. */
export const CONTRACT_STATUS = Object.freeze({
  PENDING_SHELTER_SIGNATURE: 'pending_shelter_signature',
  FULLY_SIGNED: 'fully_signed',
  CANCELLED: 'cancelled',
});

const iso8601 = z.string().datetime({ offset: true });

const baseContract = z.object({
  application_id: z.string().min(1).max(200),
  pet_id: z.string().min(1).max(200),
  adopter_uid: z.string().min(1).max(200),
  adopter_signature_text: z.string().min(3).max(200),
  adopter_signed_at: iso8601,
  shelter_club_id: z.string().min(1).max(200),
  document_hash: z.string().regex(/^[a-f0-9]{64}$/i, 'SHA-256 hex (64 chars)'),
  document_version: z.string().min(1).max(100),
  pdf_storage_path: z.string().regex(/^clubs\/[^/]+\/contracts\/[^/]+\.pdf$/),
  pdf_size_bytes: z.number().int().nonnegative(),
  status: z.enum([
    CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE,
    CONTRACT_STATUS.FULLY_SIGNED,
    CONTRACT_STATUS.CANCELLED,
  ]),
  created_at: iso8601,
  updated_at: iso8601,
});

/** Schema do create (assinatura do adotante) — sem shelter_signed_at. */
export const createContractSchema = baseContract.omit({
  shelter_signed_at: true,
  shelter_signature_text: true,
  shelter_representative_uid: true,
  shelter_representative_name: true,
}).strict().extend({
  status: z.literal(CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE),
});

/** Schema do update (assinatura do abrigo). */
export const shelterSignContractSchema = z.object({
  shelter_representative_uid: z.string().min(1).max(200),
  shelter_representative_name: z.string().min(3).max(200),
  shelter_signature_text: z.string().min(3).max(200),
  shelter_signed_at: iso8601,
  status: z.literal(CONTRACT_STATUS.FULLY_SIGNED),
  updated_at: iso8601,
});

/** Schema do cancelamento. */
export const cancelContractSchema = z.object({
  status: z.literal(CONTRACT_STATUS.CANCELLED),
  updated_at: iso8601,
});

/** Helper — parse com erro formatado. */
export function parseContractOrThrow(data) {
  const result = createContractSchema.safeParse(data);
  if (!result.success) {
    const err = new Error('Contract validation failed');
    err.code = 'contract/validation';
    err.issues = result.error.issues;
    throw err;
  }
  return result.data;
}
