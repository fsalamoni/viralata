/**
 * @fileoverview petNotesService — anotações livres dos administradores do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): subcoleção `pets/{petId}/pet_notes`.
 * Cada nota é um registro individual com texto, autor e timestamp.
 * Notas podem ser excluídas APENAS pelo autor ou platform_admin.
 *
 * @see docs/REGENCY_PET_OPS_V3.md
 */
import {
  collection, doc, getDocs, addDoc, deleteDoc, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { ensureCanMutatePet } from './petService';
import { appendPetLog, PET_LOG_ACTIONS } from './petLogService';

/** Lista as últimas N anotações (mais recentes primeiro). */
export async function listPetNotes(petId, maxResults = 100) {
  if (!db || !petId) return [];
  try {
    const q = query(
      collection(db, 'pets', petId, 'pet_notes'),
      orderBy('created_at', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('[petNotes] listPetNotes falhou', err);
    return [];
  }
}

/** Cria uma nova anotação. Só canManage. */
export async function createPetNote(petId, { text }, actor) {
  if (!db || !petId) throw new Error('Pet inválido.');
  if (!text || !text.trim()) throw new Error('A anotação não pode estar vazia.');
  await ensureCanMutatePet(petId, actor);

  const trimmed = text.trim();
  const payload = {
    text: trimmed,
    author_uid: actor?.uid || null,
    author_name: actor?.displayName || actor?.name || actor?.email || 'Anônimo',
    author_email: actor?.email || null,
    created_at: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'pet_notes'), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.NOTE_CREATED,
    actor,
    target: { collection: 'pet_notes', docId: ref.id },
    details: { text_preview: trimmed.slice(0, 80) },
  });
  return ref.id;
}

/** Exclui uma anotação. Só o autor ou platform_admin. */
export async function deletePetNote(petId, noteId, actor) {
  if (!db || !petId || !noteId) throw new Error('Parâmetros inválidos.');
  await ensureCanMutatePet(petId, actor);

  // Defense-in-depth: checa se o user é o autor (ou platform_admin)
  const noteSnap = await getDocs(query(collection(db, 'pets', petId, 'pet_notes')));
  const note = noteSnap.docs.find((d) => d.id === noteId);
  if (!note) throw new Error('Anotação não encontrada.');
  const noteData = note.data();
  const isAuthor = noteData.author_uid === actor?.uid;
  const isPlatformAdmin = actor?.email === 'fsalamoni@gmail.com' || actor?.isPlatformAdmin === true;
  if (!isAuthor && !isPlatformAdmin) {
    throw new Error('Apenas o autor (ou platform_admin) pode excluir esta anotação.');
  }

  await deleteDoc(doc(db, 'pets', petId, 'pet_notes', noteId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.NOTE_DELETED,
    actor,
    target: { collection: 'pet_notes', docId: noteId },
    details: { text_preview: (noteData.text || '').slice(0, 80) },
  });
}
