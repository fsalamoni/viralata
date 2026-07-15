/**
 * @fileoverview Serviço de Avaliações pós-adoção — coleção `adoption_ratings`.
 * ID determinístico: `{petId}_{raterUid}` (1 avaliação por pessoa, por pet).
 */
import {
  doc, getDoc, setDoc, getDocs, collection, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { createNotification, NOTIFICATION_TYPE } from '@/core/services/notificationService';

const COLLECTION = 'adoption_ratings';

function ratingId(petId, raterUid) {
  return `${petId}_${raterUid}`;
}

/** Registra a avaliação de uma das partes da adoção (adotante ou doador). */
export async function createRating({ petId, ratedUid, stars, comment }, actor) {
  if (!db || !petId || !ratedUid || !actor?.uid) throw new Error('Dados inválidos');
  if (actor.uid === ratedUid) throw new Error('Não é possível avaliar a si mesmo.');
  const normalizedStars = Math.min(5, Math.max(1, Math.round(Number(stars) || 0)));

  const id = ratingId(petId, actor.uid);
  await setDoc(doc(db, COLLECTION, id), {
    pet_id: petId,
    rater_uid: actor.uid,
    rater_name: actor.displayName || '',
    rated_uid: ratedUid,
    stars: normalizedStars,
    comment: String(comment ?? '').trim().slice(0, 500),
    created_at: serverTimestamp(),
  });

  await createNotification({
    userId: ratedUid,
    title: 'Você recebeu uma avaliação!',
    message: `${actor.displayName || 'Alguém'} avaliou sua experiência de adoção.`,
    type: NOTIFICATION_TYPE.GENERIC,
    link: `/pets/${petId}`,
    actor,
  });

  // TASK-351: targetUserId = voluntário do abrigo que recebeu a avaliação
  await createAuditLog({ action: 'adoption_rating_created', actor, targetUserId: ratedUid, details: { pet_id: petId } });
}

/** Avaliação (se houver) que o usuário atual já fez para este pet. */
export async function getMyRatingForPet(petId, raterUid) {
  if (!db || !petId || !raterUid) return null;
  const snap = await getDoc(doc(db, COLLECTION, ratingId(petId, raterUid)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Todas as avaliações recebidas por um usuário (para calcular a reputação). */
export async function getRatingsForUser(uid) {
  if (!db || !uid) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('rated_uid', '==', uid), orderBy('created_at', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Média e contagem de estrelas recebidas por um usuário. */
export function summarizeRatings(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return { avg: 0, count: 0 };
  const count = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + (Number(r.stars) || 0), 0);
  return { avg: Math.round((sum / count) * 10) / 10, count };
}
