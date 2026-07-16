/**
 * shelterLedgerService.js — TASK-791
 *
 * Serviço de prestação de contas (ledger) do abrigo.
 * Coleções:
 *   - clubs/{clubId}/shelter_ledger          (lançamentos)
 *   - clubs/{clubId}/shelter_ledger_categories (categorias customizadas)
 *
 * Campos de lançamento (shelter_ledger):
 *   - type: 'revenue' | 'expense'
 *   - category: string
 *   - value: number
 *   - date: string (YYYY-MM-DD)
 *   - note: string (opcional)
 *   - created_by: uid
 *
 * Regras (firestore.rules):
 *   - shelter_ledger: leitura pública (transparência), escrita por
 *     membros com permissão finance (verificado no service).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

/* ============================== Enums ============================== */

export const SHELTER_LEDGER_TYPE = Object.freeze({
  REVENUE: 'revenue',
  EXPENSE: 'expense',
});

export const SHELTER_LEDGER_CATEGORY_PRESETS = Object.freeze({
  [SHELTER_LEDGER_TYPE.REVENUE]: [
    'Doações em dinheiro',
    'Doações em produto',
    'Patrocínio',
    'Bazar',
    'Evento beneficente',
    'Adoção com taxa',
    'Outros',
  ],
  [SHELTER_LEDGER_TYPE.EXPENSE]: [
    'Ração',
    'Veterinário',
    'Medicamentos',
    'Castração',
    'Estrutura (aluguel, conta)',
    'Transporte',
    'Vacinas',
    'Impostos e taxas',
    'Outros',
  ],
});

export const SHELTER_FINANCE_PERIOD = Object.freeze({
  FULL: 'full',
  MONTHLY: 'monthly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
});

export const SHELTER_FINANCE_PERIOD_LABELS = Object.freeze({
  [SHELTER_FINANCE_PERIOD.FULL]: 'Integral',
  [SHELTER_FINANCE_PERIOD.MONTHLY]: 'Mensal',
  [SHELTER_FINANCE_PERIOD.SEMIANNUAL]: 'Semestral',
  [SHELTER_FINANCE_PERIOD.ANNUAL]: 'Anual',
});

export const SHELTER_FINANCE_LIMITS = Object.freeze({
  VALUE_MIN: 0.01,
  NOTE_MAX: 300,
  CATEGORY_MAX: 80,
});

/* ============================== Helpers ============================== */

function trimmed(value) {
  return String(value ?? '').trim();
}

function ledgerCol(clubId) {
  return collection(db, 'clubs', clubId, 'shelter_ledger');
}

function ledgerCategoriesCol(clubId) {
  return collection(db, 'clubs', clubId, 'shelter_ledger_categories');
}

/* ============================== Lançamentos ============================== */

export async function listShelterLedgerEntries(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(
      query(ledgerCol(clubId), orderBy('date', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('listShelterLedgerEntries', { clubId, err: String(err) });
    return [];
  }
}

export async function createShelterLedgerEntry(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const type = data.type === SHELTER_LEDGER_TYPE.EXPENSE
    ? SHELTER_LEDGER_TYPE.EXPENSE
    : SHELTER_LEDGER_TYPE.REVENUE;
  const value = Number(data.value) || 0;
  if (value <= 0) throw new Error('Informe um valor maior que zero.');
  if (!trimmed(data.category)) throw new Error('Selecione uma categoria.');
  if (!trimmed(data.date)) throw new Error('Informe a data do lançamento.');
  const id = doc(ledgerCol(clubId)).id;
  await setDoc(doc(ledgerCol(clubId), id), {
    id,
    club_id: clubId,
    type,
    category: trimmed(data.category),
    value,
    date: trimmed(data.date),
    note: trimmed(data.note),
    created_by: user.uid,
    created_at_ms: Date.now(),
  });
  await createAuditLog({
    action: 'shelter_ledger_entry_created',
    actor: user,
    details: { club_id: clubId, entry_id: id, type, value },
  }).catch(() => {});
  return id;
}

export async function deleteShelterLedgerEntry(entryId, actor) {
  if (!db || !entryId) return;
  // We need clubId to delete — but Firestore doc path is in entryId
  // entryId format: clubs/{clubId}/shelter_ledger/{id}
  try {
    const snap = await getDoc(doc(db, entryId));
    if (!snap.exists()) return;
    await deleteDoc(doc(db, entryId));
    await createAuditLog({
      action: 'shelter_ledger_entry_deleted',
      actor,
      details: { entry_id: entryId },
    }).catch(() => {});
  } catch (err) {
    logger.warn('deleteShelterLedgerEntry', { entryId, err: String(err) });
  }
}

/* ============================== Categorias customizadas ============================== */

export async function listShelterLedgerCategories(clubId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(query(ledgerCategoriesCol(clubId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('listShelterLedgerCategories', { clubId, err: String(err) });
    return [];
  }
}

export async function createShelterLedgerCategory(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const type = data.type === SHELTER_LEDGER_TYPE.EXPENSE
    ? SHELTER_LEDGER_TYPE.EXPENSE
    : SHELTER_LEDGER_TYPE.REVENUE;
  const label = trimmed(data.label);
  if (!label) throw new Error('Informe o rótulo da categoria.');
  if (label.length > SHELTER_FINANCE_LIMITS.CATEGORY_MAX) {
    throw new Error(`Rótulo muito longo (máx ${SHELTER_FINANCE_LIMITS.CATEGORY_MAX} caracteres).`);
  }
  const id = doc(ledgerCategoriesCol(clubId)).id;
  await setDoc(doc(ledgerCategoriesCol(clubId), id), {
    id,
    club_id: clubId,
    type,
    label,
    created_by: user.uid,
    created_at_ms: Date.now(),
  });
  return id;
}

export async function updateShelterLedgerCategory(categoryId, updates, actor) {
  const allowed = ['label'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      sanitized[key] = trimmed(updates[key]);
    }
  });
  await setDoc(doc(db, categoryId), sanitized, { merge: true }).catch(() => {});
}

export async function deleteShelterLedgerCategory(categoryId, actor) {
  if (!db || !categoryId) return;
  await deleteDoc(doc(db, categoryId)).catch(() => {});
}
