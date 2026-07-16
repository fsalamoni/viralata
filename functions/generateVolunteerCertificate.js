/**
 * @fileoverview generateVolunteerCertificate — Cloud Function callable v2 (TASK-248).
 *
 * Gera um PDF de certificado de horas de voluntariado conforme
 * Lei 9.608/1998 (Lei do Voluntariado) e o termo v2 §6.1(e).
 *
 * O voluntário logado pode gerar seu próprio certificado. Admins
 * (platform_admin) podem gerar para qualquer uid.
 *
 * Storage: GCS `viralata-assets` / volunteer_certificates/{uid}/{YYYY-MM-DD}.pdf
 *
 * LGPD: Art.7 IV — certificado é documento pessoal do voluntário,
 * base legal: execução de contrato (termo de voluntariado v2).
 * Retenção: vida útil do certificado + 5 anos (LGPD Art.7 I).
 *
 * @see generateVolunteerCertificateCore.cjs
 * @see TASK-248
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { generateVolunteerCertificate } = require('./generateVolunteerCertificateCore.cjs');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

/**
 * Verifica se o caller é platform_admin.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
async function isPlatformAdmin(uid) {
  const db = getFirestore(DATABASE_ID);
  try {
    const snap = await db.collection('admins').doc(uid).get();
    return snap.exists;
  } catch {
    return false;
  }
}

exports.generateVolunteerCertificate = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    }

    const { uid: targetUid, fromDate, toDate, cpf } = request.data || {};

    // Validação: só pode gerar para si mesmo, ou ser admin
    const isAdmin = await isPlatformAdmin(callerUid);
    if (!isAdmin && targetUid && targetUid !== callerUid) {
      throw new HttpsError('permission-denied',
        'Apenas admins podem gerar certificados para outros usuários.');
    }

    const resolvedUid = targetUid || callerUid;

    // Validação básica de período
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new HttpsError('invalid-argument', 'Datas devem estar no formato YYYY-MM-DD.');
      }
      if (from > to) {
        throw new HttpsError('invalid-argument', 'fromDate não pode ser posterior a toDate.');
      }
    }

    // Maximum 2-year range
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffDays = (to - from) / (1000 * 60 * 60 * 24);
      if (diffDays > 730) {
        throw new HttpsError('invalid-argument', 'O período máximo é de 2 anos.');
      }
    }

    const db = getFirestore(DATABASE_ID);
    const storage = getStorage();

    try {
      const result = await generateVolunteerCertificate(
        { uid: resolvedUid, fromDate, toDate, cpf },
        { db, storage, logger },
      );

      logger.info('generateVolunteerCertificate: success', {
        callerUid, targetUid: resolvedUid,
        totalHours: result.totalHours,
        totalParticipations: result.totalParticipations,
        storagePath: result.storagePath,
      });

      return result;
    } catch (err) {
      logger.error('generateVolunteerCertificate: error', {
        callerUid, targetUid: resolvedUid,
        error: String(err),
      });
      throw new HttpsError('internal', `Erro ao gerar certificado: ${err.message}`);
    }
  },
);
