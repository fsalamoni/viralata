/**
 * @fileoverview Serviço de Organizações (ONGs/Lojas) — Viralata
 * Baseado no clubService, adaptado para o contexto de adoção de pets.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch, setDoc,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { createNotification, NOTIFICATION_TYPE } from '@/core/services/notificationService';
import { logger } from '@/core/lib/logger';

const ORGS = 'organizations';
const MEMBERS = 'organization_members';
const REPORTS = 'organization_reports';

function memberId(orgId, uid) { return `${orgId}_${uid}`; }
function generateInviteCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

// ─── Organizações ────────────────────────────────────────────────────────────

export async function getOrganizationById(orgId) {
  if (!db || !orgId) return null;
  const snap = await getDoc(doc(db, ORGS, orgId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllOrganizations() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ORGS), orderBy('name', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOrganizationsByCity(city, state) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ORGS), where('city', '==', city), where('state', '==', state)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createOrganization(data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const invite_code = generateInviteCode();
  const ref = await addDoc(collection(db, ORGS), {
    ...data,
    invite_code,
    member_count: 1,
    pet_count: 0,
    created_by: actor.uid,
    creator_name: actor.displayName || '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  // Adiciona o criador como admin
  await setDoc(doc(db, MEMBERS, memberId(ref.id, actor.uid)), {
    org_id: ref.id,
    user_id: actor.uid,
    user_name: actor.displayName || '',
    user_email: actor.email || '',
    photo_url: actor.photoURL || '',
    role: 'admin',
    joined_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'organization_created', actor, details: { org_id: ref.id, name: data.name } });
  return ref.id;
}

export async function updateOrganization(orgId, updates, actor) {
  if (!db || !orgId) throw new Error('Dados inválidos');
  await updateDoc(doc(db, ORGS, orgId), { ...updates, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'organization_updated', actor, details: { org_id: orgId } });
}

// ─── Membros ─────────────────────────────────────────────────────────────────

export async function getOrgMembers(orgId) {
  if (!db || !orgId) return [];
  const snap = await getDocs(query(collection(db, MEMBERS), where('org_id', '==', orgId), orderBy('joined_at', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserOrganizations(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, MEMBERS), where('user_id', '==', userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function isOrgAdmin(orgId, userId) {
  if (!db || !orgId || !userId) return false;
  const snap = await getDoc(doc(db, MEMBERS, memberId(orgId, userId)));
  return snap.exists() && snap.data().role === 'admin';
}

export async function joinOrganizationByCode(inviteCode, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const snap = await getDocs(query(collection(db, ORGS), where('invite_code', '==', inviteCode.toUpperCase())));
  if (snap.empty) throw new Error('Código de convite inválido.');
  const orgDoc = snap.docs[0];
  const orgId = orgDoc.id;
  const existing = await getDoc(doc(db, MEMBERS, memberId(orgId, actor.uid)));
  if (existing.exists()) throw new Error('Você já é membro desta organização.');
  await setDoc(doc(db, MEMBERS, memberId(orgId, actor.uid)), {
    org_id: orgId,
    user_id: actor.uid,
    user_name: actor.displayName || '',
    user_email: actor.email || '',
    photo_url: actor.photoURL || '',
    role: 'member',
    joined_at: serverTimestamp(),
  });
  await updateDoc(doc(db, ORGS, orgId), { member_count: (orgDoc.data().member_count || 0) + 1 });
  await createAuditLog({ action: 'org_member_joined', actor, details: { org_id: orgId } });
  return orgId;
}

export async function removeMember(orgId, userId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, MEMBERS, memberId(orgId, userId)));
  await createAuditLog({ action: 'org_member_removed', actor, details: { org_id: orgId, user_id: userId } });
}

// ─── Prestação de Contas ─────────────────────────────────────────────────────

export async function getOrgReports(orgId) {
  if (!db || !orgId) return [];
  const snap = await getDocs(query(collection(db, REPORTS), where('org_id', '==', orgId), orderBy('year', 'desc'), orderBy('month', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createOrgReport(reportData, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const ref = await addDoc(collection(db, REPORTS), {
    ...reportData,
    created_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'org_report_created', actor, details: { org_id: reportData.org_id } });
  return ref.id;
}
