/**
 * @fileoverview TASK-344: Callable Cloud Function — generateEventIcs.
 *
 * Gera arquivo .ics (RFC 5545) para um evento de clube.
 * Se o evento tem datas individuais (club_event_dates subcollection),
 * gera um VEVENT por data; caso contrário usa starts_at/ends_at do documento.
 *
 * Segurança:
 *   - Callable v2: autenticado, quota limitada
 *   - Validação de eventId via Firestore: lê apenas club_events/{eventId}
 *   - Dados retornados são only ICS text, sem PII adicional
 *
 * LGPD: dados pessoais mínimos; retorno é conteúdo de calendário, não Dados Pessoais.
 *
 * @see TASK-344
 * @see generateEventIcsCore.cjs
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { generateEventIcs } = require('./generateEventIcsCore.cjs');

const REGION      = 'southamerica-east1';
const APP_URL     = process.env.APP_URL || 'https://viralata.app';
const MAX_DATES   = 100; // safety cap

/** @param {string} s */
function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Callable HTTP: generateEventIcs
 *
 * Body (data):
 *   { eventId: string, appUrl?: string }
 *
 * Returns:
 *   { ics: string, filename: string }
 *
 * Throws:
 *   HttpsError('invalid-argument')  — missing eventId
 *   HttpsError('not-found')         — event not found or access denied
 *   HttpsError('internal')          — unexpected error
 */
exports.generateEventIcs = onCall(
  { region: REGION, memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    const { data } = request;

    if (!data || !isNonEmptyString(data.eventId)) {
      throw new HttpsError('invalid-argument', 'eventId é obrigatório.');
    }

    const eventId = data.eventId.trim();
    const appUrl  = isNonEmptyString(data.appUrl) ? data.appUrl.trim() : APP_URL;

    logger.info(`generateEventIcs called for eventId=${eventId}`);

    let event;
    try {
      const db = getFirestore();
      const eventSnap = await db.collection('club_events').doc(eventId).get();
      if (!eventSnap.exists) {
        logger.warn(`generateEventIcs: event ${eventId} not found`);
        throw new HttpsError('not-found', 'Evento não encontrado.');
      }
      event = { id: eventSnap.id, ...eventSnap.data() };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('generateEventIcs: Firestore error', err);
      throw new HttpsError('internal', 'Erro ao buscar evento.');
    }

    // Optionally load individual dates
    let dates = [];
    try {
      const db = getFirestore();
      const datesSnap = await db
        .collection('club_events')
        .doc(eventId)
        .collection('event_dates')
        .orderBy('date_time')
        .limit(MAX_DATES)
        .get();
      dates = datesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Subcollection may not exist — log and continue without dates
      logger.warn('generateEventIcs: could not read event_dates subcollection', err?.message);
    }

    let result;
    try {
      result = generateEventIcs(event, dates, { appUrl });
    } catch (err) {
      logger.error('generateEventIcs: ICS generation error', err);
      throw new HttpsError('internal', 'Erro ao gerar o arquivo ICS.');
    }

    logger.info(`generateEventIcs: success for eventId=${eventId}, dates=${dates.length}`);
    return result;
  }
);
