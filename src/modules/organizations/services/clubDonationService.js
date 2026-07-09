/**
 * Serviço de Chamados de Doação (v2) — coleções `club_donations` e
 * `club_donation_receipts`.
 *
 * Diferenças em relação à v1 (`club_campaigns`):
 *  - Inclui campos para pagamento (PIX key/QR, dados bancários).
 *  - Suporta upload de comprovante de contribuição pelo público.
 *  - A ONG gerencia os comprovantes em uma seção à parte.
 *
 * Regras (firestore.rules):
 *  - `club_donations` é público para leitura (transparência) e gravado
 *    apenas por admin ou alguém com permissão `donations`.
 *  - `club_donation_receipts` é lido pelo próprio usuário + equipe da ONG.
 *  - Qualquer usuário autenticado pode enviar um comprovante, desde que a
 *    doação tenha `enable_receipt_upload === true`.
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
import { CLUB_COLLECTIONS, RECEIPT_STATUS, CAMPAIGN_STATUS, ORG_DONATION_LIMITS } from '../domain/constants.js';
import { normalizeDonationInput, normalizeReceiptInput } from '../domain/validators.js';

const COL = CLUB_COLLECTIONS;

function trimmed(value) {
  return String(value ?? '').trim();
}

/* ============================== Doações (chamados) ============================== */

export async function listClubDonations(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.donations), where('club_id', '==', clubId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
}

export async function getClubDonation(donationId) {
  if (!db || !donationId) return null;
  const snap = await getDoc(doc(db, COL.donations, donationId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createClubDonation(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeDonationInput(data);
  const id = doc(collection(db, COL.donations)).id;
  await setDoc(doc(db, COL.donations, id), {
    id,
    club_id: clubId,
    ...norm,
    status: CAMPAIGN_STATUS.ACTIVE,
    receipts_count: 0,
    created_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'club_donation_created', actor: user, details: { club_id: clubId, donation_id: id } });
  return id;
}

export async function updateClubDonation(donationId, updates, actor) {
  const allowed = ['title', 'description', 'goal', 'raised', 'deadline', 'status', 'pix_key', 'pix_qr_url', 'bank_info', 'enable_receipt_upload'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] === undefined) return;
    if (typeof updates[key] === 'boolean') sanitized[key] = !!updates[key];
    else if (key === 'goal' || key === 'raised') sanitized[key] = Number(updates[key]) || 0;
    else if (key === 'deadline') sanitized[key] = trimmed(updates[key]) || null;
    else if (key === 'status') sanitized[key] = updates[key] === CAMPAIGN_STATUS.CONCLUDED ? CAMPAIGN_STATUS.CONCLUDED : CAMPAIGN_STATUS.ACTIVE;
    else sanitized[key] = trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.donations, donationId), { ...sanitized, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_donation_updated', actor, details: { donation_id: donationId, fields: Object.keys(sanitized) } });
}

export async function addDonationFunds(donationId, amount, actor) {
  const value = Number(amount) || 0;
  if (value <= 0) throw new Error('Informe um valor maior que zero.');
  await updateDoc(doc(db, COL.donations, donationId), { raised: increment(value), updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_donation_funds_added', actor, details: { donation_id: donationId, amount: value } });
}

export async function deleteClubDonation(donationId, actor) {
  await deleteDoc(doc(db, COL.donations, donationId));
  await createAuditLog({ action: 'club_donation_deleted', actor, details: { donation_id: donationId } });
}

/* ============================== Comprovantes ============================== */

export async function listDonationReceipts(donationId) {
  if (!db || !donationId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, COL.donationReceipts), where('donation_id', '==', donationId), orderBy('created_at_ms', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.info('listDonationReceipts: fallback sem orderBy', { donationId, err: err?.code });
    const snap = await getDocs(query(collection(db, COL.donationReceipts), where('donation_id', '==', donationId)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
  }
}

export async function listAllDonationReceipts(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, COL.donationReceipts), where('club_id', '==', clubId), orderBy('created_at_ms', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.info('listAllDonationReceipts: fallback sem orderBy', { clubId, err: err?.code });
    const snap = await getDocs(query(collection(db, COL.donationReceipts), where('club_id', '==', clubId)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
  }
}

export async function createDonationReceipt(donationId, input, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeReceiptInput({ ...input, donation_id: donationId });
  // Confere que a doação tem `enable_receipt_upload === true`.
  const donation = await getClubDonation(donationId);
  if (!donation) throw new Error('Chamado de doação não encontrado.');
  if (donation.enable_receipt_upload === false) {
    throw new Error('Este chamado não está recebendo comprovantes no momento.');
  }
  const id = doc(collection(db, COL.donationReceipts)).id;
  await setDoc(doc(db, COL.donationReceipts, id), {
    id,
    donation_id: donationId,
    club_id: donation.club_id,
    user_id: user.uid,
    user_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Usuário',
    user_photo: profile?.photo_url || user.photoURL || '',
    file_url: norm.file_url,
    file_name: norm.file_name,
    file_type: norm.file_type,
    file_size: norm.file_size,
    note: norm.note,
    status: RECEIPT_STATUS.PENDING,
    reviewed_by: null,
    reviewed_at: null,
    admin_note: '',
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  await updateDoc(doc(db, COL.donations, donationId), {
    receipts_count: increment(1),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_donation_receipt_submitted',
    actor: user,
    details: { donation_id: donationId, receipt_id: id },
  });
  return id;
}

export async function updateReceiptStatus(receiptId, status, adminNote, actor) {
  const sanitizedStatus = Object.values(RECEIPT_STATUS).includes(status)
    ? status
    : RECEIPT_STATUS.PENDING;
  await updateDoc(doc(db, COL.donationReceipts, receiptId), {
    status: sanitizedStatus,
    admin_note: trimmed(adminNote).slice(0, ORG_DONATION_LIMITS.RECEIPT_NOTE_MAX),
    reviewed_by: actor?.uid || null,
    reviewed_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_donation_receipt_status_updated',
    actor,
    details: { receipt_id: receiptId, status: sanitizedStatus },
  });
}

export async function deleteDonationReceipt(receiptId, actor) {
  // Decrementa o contador da doação e apaga o doc.
  const ref = doc(db, COL.donationReceipts, receiptId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await deleteDoc(ref);
    if (data.donation_id) {
      await updateDoc(doc(db, COL.donations, data.donation_id), {
        receipts_count: increment(-1),
        updated_at: serverTimestamp(),
      }).catch(() => {});
    }
  }
  await createAuditLog({ action: 'club_donation_receipt_deleted', actor, details: { receipt_id: receiptId } });
}
