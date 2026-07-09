/**
 * Serviço de Categorias customizadas da prestação de contas de uma ONG.
 *
 * O admin pode criar/editar/excluir categorias de receita e despesa. As
 * categorias padrão ficam definidas em `domain/constants.js` (LEDGER_CATEGORY_PRESETS)
 * e continuam disponíveis mesmo que a ONG não crie nenhuma customizada.
 *
 * Regras (firestore.rules):
 *  - Leitura: apenas membros da ONG.
 *  - Escrita: admin ou alguém com permissão `finance`.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { CLUB_COLLECTIONS } from '../domain/constants.js';
import { normalizeLedgerCategoryInput } from '../domain/validators.js';

const COL = CLUB_COLLECTIONS;

function trimmed(value) {
  return String(value ?? '').trim();
}

export async function listLedgerCategories(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(query(collection(db, COL.ledgerCategories), where('club_id', '==', clubId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.error('listLedgerCategories falhou', err);
    return [];
  }
}

export async function createLedgerCategory(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeLedgerCategoryInput(data);
  const id = doc(collection(db, COL.ledgerCategories)).id;
  await setDoc(doc(db, COL.ledgerCategories, id), {
    id,
    club_id: clubId,
    type: norm.type,
    label: norm.label,
    is_preset: false,
    created_by: user.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_ledger_category_created',
    actor: user,
    details: { club_id: clubId, category_id: id, type: norm.type, label: norm.label },
  });
  return id;
}

export async function updateLedgerCategory(categoryId, updates, actor) {
  const allowed = ['label'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) sanitized[key] = trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.ledgerCategories, categoryId), { ...sanitized, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_ledger_category_updated', actor, details: { category_id: categoryId } });
}

export async function deleteLedgerCategory(categoryId, actor) {
  await deleteDoc(doc(db, COL.ledgerCategories, categoryId));
  await createAuditLog({ action: 'club_ledger_category_deleted', actor, details: { category_id: categoryId } });
}
