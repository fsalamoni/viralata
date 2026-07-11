/**
 * @fileoverview Gerenciamento de platform_admins (Fase 21).
 *
 * Função: promover / rebaixar platform_admins. Apenas o dono
 * fixo da plataforma (e-mail bootstrap — `fsalamoni@gmail.com`)
 * pode fazer isso, e ele/ela NÃO pode se remover.
 *
 * Persistência: `users/{uid}.role` é IMUTÁVEL para si mesmo. A
 * regra Firestore já garante isso:
 *  - update: o próprio user NÃO pode mudar seu role (exceto o
 *    bootstrap do dono fixo);
 *  - delete: platform_admin.
 *
 * Aqui só adicionamos a camada de service que:
 *  1. valida que o actor é o dono fixo;
 *  2. atualiza o doc;
 *  3. escreve audit log com `platform_admin_promoted` /
 *     `platform_admin_demoted` (imutável).
 */

import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

export const PLATFORM_OWNER_EMAIL = 'fsalamoni@gmail.com';

export function isPlatformOwnerEmail(email) {
  return String(email || '').toLowerCase() === PLATFORM_OWNER_EMAIL;
}

/**
 * Lança erro se o actor não for o dono fixo da plataforma.
 * @param {object} actor
 */
export function assertIsPlatformOwner(actor) {
  if (!actor || !isPlatformOwnerEmail(actor.email)) {
    const err = new Error(
      'Apenas o dono fixo da plataforma pode gerenciar platform_admins.',
    );
    err.code = 'NOT_PLATFORM_OWNER';
    throw err;
  }
}

/**
 * Promove um usuário a platform_admin. Apenas o dono fixo pode
 * chamar. O próprio owner NÃO pode se promover duas vezes — o
 * doc já tem role='platform_admin' no bootstrap, mas a função é
 * idempotente.
 *
 * @param {string} targetUid
 * @param {object} actor
 * @returns {Promise<{ok: true, already: boolean}>}
 */
export async function promoteToAdmin(targetUid, actor) {
  if (!db) throw new Error('Firestore não inicializado.');
  if (!targetUid) throw new Error('UID do alvo é obrigatório.');
  assertIsPlatformOwner(actor);
  if (actor.uid === targetUid) {
    // Owner não precisa se promover — já é admin.
    return { ok: true, already: true };
  }

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const err = new Error(`Usuário ${targetUid} não encontrado.`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  const currentRole = userSnap.data().role;
  if (currentRole === 'platform_admin') {
    return { ok: true, already: true };
  }

  await updateDoc(userRef, {
    role: 'platform_admin',
    promoted_by: actor.uid,
    promoted_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'platform_admin_promoted',
    actor,
    userId: targetUid,
    details: { target_uid: targetUid, target_email: userSnap.data().email || null },
  });

  return { ok: true, already: false };
}

/**
 * Rebaixa um platform_admin para user comum. Apenas o dono fixo
 * pode chamar. **NÃO** permite rebaixar o próprio owner (regra
 * de segurança: admin não pode se remover).
 *
 * @param {string} targetUid
 * @param {object} actor
 * @returns {Promise<{ok: true, already: boolean, self_demote_blocked?: boolean}>}
 */
export async function demoteFromAdmin(targetUid, actor) {
  if (!db) throw new Error('Firestore não inicializado.');
  if (!targetUid) throw new Error('UID do alvo é obrigatório.');
  assertIsPlatformOwner(actor);

  // CRÍTICO: admin não pode se remover. Só o owner pode, e mesmo
  // assim esta função bloqueia o self-demote — quem quer se remover
  // tem que mexer no Firestore diretamente (e o audit log pega).
  if (actor.uid === targetUid) {
    return { ok: false, already: false, self_demote_blocked: true };
  }

  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const err = new Error(`Usuário ${targetUid} não encontrado.`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  const currentRole = userSnap.data().role;
  if (currentRole !== 'platform_admin') {
    return { ok: true, already: true };
  }

  await updateDoc(userRef, {
    role: 'user',
    demoted_by: actor.uid,
    demoted_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'platform_admin_demoted',
    actor,
    userId: targetUid,
    details: { target_uid: targetUid, target_email: userSnap.data().email || null },
  });

  return { ok: true, already: false };
}

/**
 * Lista todos os platform_admins. Usado pela página
 * `/admin/admins`.
 *
 * @returns {Promise<Array<{id: string, ...profile}>>}
 */
export async function listPlatformAdmins() {
  if (!db) return [];
  // Import dinâmico para evitar ciclo entre client SDK e este
  // service (auditService é importado por aqui estaticamente).
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'platform_admin')),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.full_name || a.email || '').localeCompare(
      String(b.full_name || b.email || ''), 'pt-BR',
    ));
}

/** @internal helper só para testes */
export const __testing = { PLATFORM_OWNER_EMAIL, isPlatformOwnerEmail, assertIsPlatformOwner };
