/**
 * @fileoverview broadcastService — notificação segmentada do admin
 * master (TASK-174).
 *
 * Resolve um segmento em uma lista de userIds e dispara via
 * `notifyUsers`. Segmentos suportados (mapeados para dados que já
 * existem no Firestore — sem campos novos):
 *   - all:            todos os users
 *   - adopters:       users com pelo menos 1 interesse de adoção
 *   - volunteers:     users com volunteer_profile (collectionGroup)
 *   - shelter_admins: membros de organização com role admin/owner
 *   - city:           users com city igual (case/acento-insensitive)
 *
 * Cap de 500 destinatários por disparo (writes em série no client;
 * volumes maiores pedem Cloud Function — TASK-228).
 */

import {
  collection, collectionGroup, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { notifyUsers } from '@/core/services/notificationService';
import { createAuditLog } from '@/core/services/auditService';

export const BROADCAST_SEGMENTS = Object.freeze([
  { value: 'all', label: 'Todos os usuários' },
  { value: 'adopters', label: 'Adotantes ativos (com interesse registrado)' },
  { value: 'volunteers', label: 'Voluntários' },
  { value: 'shelter_admins', label: 'Admins de abrigo/ONG' },
  { value: 'city', label: 'Por cidade' },
]);

export const BROADCAST_MAX_RECIPIENTS = 500;

function normalize(text) {
  return String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Resolve o segmento em uma lista de userIds (dedupe + cap). */
export async function resolveSegmentUserIds(segment, { city } = {}) {
  if (!db) return [];
  const ids = new Set();

  if (segment === 'all' || segment === 'city') {
    const snap = await getDocs(collection(db, 'users'));
    const wanted = normalize(city);
    snap.docs.forEach((d) => {
      if (segment === 'city' && normalize(d.data().city) !== wanted) return;
      ids.add(d.id);
    });
  } else if (segment === 'adopters') {
    const snap = await getDocs(collection(db, 'adoption_interests'));
    snap.docs.forEach((d) => { if (d.data().user_id) ids.add(d.data().user_id); });
  } else if (segment === 'volunteers') {
    const snap = await getDocs(collectionGroup(db, 'volunteer_profile'));
    // Path: users/{uid}/volunteer_profile/main → uid é o 2º segmento.
    snap.docs.forEach((d) => {
      const uid = d.ref.path.split('/')[1];
      if (uid) ids.add(uid);
    });
  } else if (segment === 'shelter_admins') {
    const snap = await getDocs(
      query(collectionGroup(db, 'organization_members'), where('role', 'in', ['admin', 'owner'])),
    );
    snap.docs.forEach((d) => { if (d.data().user_id) ids.add(d.data().user_id); });
  } else {
    throw new Error(`Segmento desconhecido: ${segment}`);
  }

  return Array.from(ids).slice(0, BROADCAST_MAX_RECIPIENTS);
}

/** Envia a notificação ao segmento e grava trilha de auditoria. */
export async function sendSegmentedBroadcast({ segment, city, title, message, link, actor }) {
  if (!title?.trim() || !message?.trim()) {
    throw new Error('Título e mensagem são obrigatórios.');
  }
  if (segment === 'city' && !city?.trim()) {
    throw new Error('Informe a cidade do segmento.');
  }
  const userIds = await resolveSegmentUserIds(segment, { city });
  if (userIds.length === 0) {
    throw new Error('Nenhum usuário encontrado para este segmento.');
  }
  await notifyUsers(userIds, {
    title: title.trim(),
    message: message.trim(),
    type: 'admin_broadcast',
    link: link?.trim() || null,
    actor,
  });
  await createAuditLog({
    action: 'admin_broadcast_sent',
    actor,
    details: {
      segment,
      city: segment === 'city' ? city.trim() : null,
      recipients: userIds.length,
      title: title.trim(),
    },
  }).catch(() => {});
  return { recipients: userIds.length };
}
