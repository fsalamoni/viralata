/**
 * shelterDonationService.js — TASK-790
 *
 * CRUD de campanhas de doação específicas do abrigo.
 * Coleções:
 *   - clubs/{clubId}/shelter_donations
 *   - clubs/{clubId}/shelter_donation_receipts
 *
 * Campos de campanha (shelter_donations):
 *   - item_type: 'ração' | 'veterinário' | 'medicamento' | 'outros'
 *   - title, description, goal, raised, deadline, status
 *   - enable_receipt_upload (bool)
 *
 * Regras (firestore.rules):
 *   - shelter_donations: público para leitura (transparência)
 *   - shelter_donations + shelter_donation_receipts: escrito apenas
 *     por membros com permissão donations (verificado no service).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

/* ============================== Enums locais ============================== */

export const SHELTER_DONATION_STATUS = Object.freeze({
  ACTIVE: 'active',
  CONCLUDED: 'concluded',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
});

export const SHELTER_DONATION_STATUS_LABELS = Object.freeze({
  [SHELTER_DONATION_STATUS.ACTIVE]: 'Aberta',
  [SHELTER_DONATION_STATUS.CONCLUDED]: 'Concluída',
  [SHELTER_DONATION_STATUS.PAUSED]: 'Pausada',
  [SHELTER_DONATION_STATUS.CANCELLED]: 'Cancelada',
});

export const SHELTER_DONATION_ITEM_TYPE = Object.freeze({
  FOOD: 'ração',
  VETERINARY: 'veterinário',
  MEDICATION: 'medicamento',
  OTHER: 'outros',
});

export const SHELTER_DONATION_ITEM_LABELS = Object.freeze({
  [SHELTER_DONATION_ITEM_TYPE.FOOD]: 'Ração',
  [SHELTER_DONATION_ITEM_TYPE.VETERINARY]: 'Veterinário',
  [SHELTER_DONATION_ITEM_TYPE.MEDICATION]: 'Medicamento',
  [SHELTER_DONATION_ITEM_TYPE.OTHER]: 'Outros',
});

export const SHELTER_RECEIPT_STATUS = Object.freeze({
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
});

export const SHELTER_RECEIPT_STATUS_LABELS = Object.freeze({
  [SHELTER_RECEIPT_STATUS.PENDING]: 'Aguardando',
  [SHELTER_RECEIPT_STATUS.REVIEWED]: 'Visualizado',
  [SHELTER_RECEIPT_STATUS.CONFIRMED]: 'Confirmado',
  [SHELTER_RECEIPT_STATUS.REJECTED]: 'Rejeitado',
});

/* ============================== Validação ============================== */

function trimmed(value) {
  return String(value ?? '').trim();
}

function cap(value, max) {
  if (!value) return '';
  return value.length > max ? value.slice(0, max) : value;
}

function normalizeDonationInput(input = {}) {
  const title = cap(trimmed(input.title), 120);
  if (!title) throw new Error('Informe o título do chamado de doação.');
  const goal = Number(input.goal) || 0;
  if (goal <= 0) throw new Error('A meta precisa ser maior que zero.');
  const itemType = Object.values(SHELTER_DONATION_ITEM_TYPE).includes(input.item_type)
    ? input.item_type
    : SHELTER_DONATION_ITEM_TYPE.OTHER;
  return {
    title,
    description: cap(trimmed(input.description), 500),
    item_type: itemType,
    goal,
    raised: Number(input.raised) || 0,
    deadline: trimmed(input.deadline) || null,
    status: input.status || SHELTER_DONATION_STATUS.ACTIVE,
    enable_receipt_upload: input.enable_receipt_upload !== false,
    quantity_goal: Number(input.quantity_goal) || null,
    quantity_unit: cap(trimmed(input.quantity_unit), 30),
  };
}

function normalizeReceiptInput(input = {}) {
  const fileUrl = trimmed(input.file_url);
  if (!fileUrl) throw new Error('Envie o comprovante (imagem ou PDF).');
  return {
    file_url: fileUrl,
    file_name: cap(trimmed(input.file_name), 200),
    file_type: trimmed(input.file_type),
    file_size: Number(input.file_size) || 0,
    note: cap(trimmed(input.note), 300),
  };
}

/* ============================== Coleções ============================== */

function donationsCol(clubId) {
  return collection(db, 'clubs', clubId, 'shelter_donations');
}

function receiptsCol(clubId) {
  return collection(db, 'clubs', clubId, 'shelter_donation_receipts');
}

/* ============================== Doações (campanhas) ============================== */

export async function listShelterDonations(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(
      query(donationsCol(clubId), orderBy('created_at_ms', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('listShelterDonations', { clubId, err: String(err) });
    return [];
  }
}

export async function getShelterDonation(clubId, donationId) {
  if (!db || !clubId || !donationId) return null;
  try {
    const snap = await getDoc(doc(donationsCol(clubId), donationId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    logger.warn('getShelterDonation', { clubId, donationId, err: String(err) });
    return null;
  }
}

export async function createShelterDonation(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeDonationInput(data);
  const id = doc(donationsCol(clubId)).id;
  await setDoc(doc(donationsCol(clubId), id), {
    id,
    club_id: clubId,
    ...norm,
    receipts_count: 0,
    created_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'shelter_donation_created',
    actor: user,
    details: { club_id: clubId, donation_id: id },
  }).catch(() => {});
  return id;
}

export async function updateShelterDonation(clubId, donationId, updates, actor) {
  const allowed = [
    'title', 'description', 'item_type', 'goal', 'raised', 'deadline',
    'status', 'enable_receipt_upload', 'quantity_goal', 'quantity_unit',
  ];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] === undefined) return;
    if (typeof updates[key] === 'boolean') sanitized[key] = !!updates[key];
    else if (key === 'goal' || key === 'raised' || key === 'quantity_goal') {
      sanitized[key] = Number(updates[key]) || 0;
    } else if (key === 'deadline') {
      sanitized[key] = trimmed(updates[key]) || null;
    } else if (key === 'status') {
      if (Object.values(SHELTER_DONATION_STATUS).includes(updates[key])) {
        sanitized[key] = updates[key];
      }
    } else if (key === 'item_type') {
      if (Object.values(SHELTER_DONATION_ITEM_TYPE).includes(updates[key])) {
        sanitized[key] = updates[key];
      }
    } else {
      sanitized[key] = trimmed(updates[key]);
    }
  });
  await updateDoc(doc(donationsCol(clubId), donationId), {
    ...sanitized,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'shelter_donation_updated',
    actor,
    details: { club_id: clubId, donation_id: donationId, fields: Object.keys(sanitized) },
  }).catch(() => {});
}

export async function addShelterDonationFunds(clubId, donationId, amount, actor) {
  const value = Number(amount) || 0;
  if (value <= 0) throw new Error('Informe um valor maior que zero.');
  await updateDoc(doc(donationsCol(clubId), donationId), {
    raised: increment(value),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'shelter_donation_funds_added',
    actor,
    details: { club_id: clubId, donation_id: donationId, amount: value },
  }).catch(() => {});
}

export async function deleteShelterDonation(clubId, donationId, actor) {
  if (!db || !clubId || !donationId) return;
  await deleteDoc(doc(donationsCol(clubId), donationId));
  await createAuditLog({
    action: 'shelter_donation_deleted',
    actor,
    details: { club_id: clubId, donation_id: donationId },
  }).catch(() => {});
}

/* ============================== Comprovantes ============================== */

export async function listShelterDonationReceipts(clubId, donationId) {
  if (!db || !clubId || !donationId) return [];
  try {
    const snap = await getDocs(
      query(
        receiptsCol(clubId),
        where('donation_id', '==', donationId),
        orderBy('created_at_ms', 'desc'),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('listShelterDonationReceipts', { clubId, donationId, err: String(err) });
    return [];
  }
}

export async function listAllShelterDonationReceipts(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(
      query(receiptsCol(clubId), orderBy('created_at_ms', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('listAllShelterDonationReceipts', { clubId, err: String(err) });
    return [];
  }
}

export async function createShelterDonationReceipt(clubId, donationId, data, user, userProfile) {
  const norm = normalizeReceiptInput(data);
  const id = doc(receiptsCol(clubId)).id;
  await setDoc(doc(receiptsCol(clubId), id), {
    id,
    donation_id: donationId,
    club_id: clubId,
    user_uid: user?.uid || null,
    user_name: userProfile?.full_name || user?.displayName || user?.email || 'Anônimo',
    user_photo: userProfile?.photo_url || user?.photoURL || null,
    ...norm,
    status: SHELTER_RECEIPT_STATUS.PENDING,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  // Incrementar contador na campanha
  await updateDoc(doc(donationsCol(clubId), donationId), {
    receipts_count: increment(1),
  }).catch(() => {});
  return id;
}

export async function updateShelterReceiptStatus(clubId, receiptId, status, adminNote, actor) {
  if (!Object.values(SHELTER_RECEIPT_STATUS).includes(status)) {
    throw new Error('Status inválido.');
  }
  await updateDoc(doc(receiptsCol(clubId), receiptId), {
    status,
    admin_note: adminNote || null,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'shelter_receipt_status_updated',
    actor,
    details: { club_id: clubId, receipt_id: receiptId, status },
  }).catch(() => {});
}

export async function deleteShelterDonationReceipt(clubId, receiptId, actor) {
  if (!db || !clubId || !receiptId) return;
  // Buscar receipt para decrementar contador
  try {
    const snap = await getDoc(doc(receiptsCol(clubId), receiptId));
    if (snap.exists()) {
      const data = snap.data();
      if (data.donation_id) {
        await updateDoc(doc(donationsCol(clubId), data.donation_id), {
          receipts_count: increment(-1),
        }).catch(() => {});
      }
    }
  } catch {} // best-effort
  await deleteDoc(doc(receiptsCol(clubId), receiptId));
  await createAuditLog({
    action: 'shelter_receipt_deleted',
    actor,
    details: { club_id: clubId, receipt_id: receiptId },
  }).catch(() => {});
}
