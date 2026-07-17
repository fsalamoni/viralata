/**
 * @fileoverview Serviço de Denúncias de Maus-Tratos — Viralata
 */
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { uploadImage } from '@/core/services/storageService';
import { createAuditLog } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';

const COLLECTION = 'abuse_reports';

export async function createAbuseReport({ description, latitude, longitude, address, photoFiles }, actor) {
  if (!db) throw new Error('Firebase não disponível');
  let photo_urls = [];
  if (photoFiles?.length) {
    photo_urls = await Promise.all(
      photoFiles.map((f) => uploadImage(f, { uid: actor.uid, folder: 'reports' }))
    );
  }
  const ref = await addDoc(collection(db, COLLECTION), {
    reporter_uid: actor.uid,
    reporter_name: actor.displayName || '',
    description,
    latitude: latitude || null,
    longitude: longitude || null,
    address: address || '',
    photo_urls,
    status: 'pending',
    created_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'abuse_report_created', actor, details: { report_id: ref.id } });
  return ref.id;
}

export async function getMyReports(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('reporter_uid', '==', userId), orderBy('created_at', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllReports() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateReportStatus(reportId, status, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, COLLECTION, reportId), {
    status,
    updated_at: serverTimestamp(),
    updated_by: actor?.uid || null,
  });
  await createAuditLog({ action: `abuse_report_status_changed`, actor, details: { report_id: reportId, new_status: status } });
}
