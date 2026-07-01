/**
 * @fileoverview Serviço do Radar de Pets — coleção `pet_radars/{uid}`.
 *
 * O radar usa o próprio perfil de onboarding do usuário (housing_type,
 * has_children, other_pets, daily_walks, budget_level) como critério de
 * compatibilidade — o mesmo `isCompatible` do feed. Este documento só
 * liga/desliga o alerta; o matching real acontece na Cloud Function
 * `onPetCreatedNotifyRadar` (ver functions/index.js) quando um pet novo é
 * cadastrado.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

const COLLECTION = 'pet_radars';

/** Lê o estado do radar do usuário. */
export async function getMyRadar(uid) {
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, COLLECTION, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Liga ou desliga o radar do usuário. */
export async function setRadarActive(uid, active) {
  if (!db || !uid) throw new Error('Usuário não autenticado.');
  await setDoc(
    doc(db, COLLECTION, uid),
    { user_id: uid, active: !!active, updated_at: serverTimestamp() },
    { merge: true },
  );
}
