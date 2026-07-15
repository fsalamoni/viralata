/**
 * @fileoverview Cloud Function scheduled: lembrete de evento 24h antes (TASK-337).
 *
 * Wrapper `onSchedule` que delega a lógica pura para `eventReminderCronCore.cjs`.
 * Esta separação permite testes unitários sem dependência do Firebase Functions runtime.
 *
 * @see functions/eventReminderCronCore.cjs
 */

'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}

const { runEventReminder } = require('./eventReminderCronCore.cjs');

const REGION = 'southamerica-east1';

// ─── Scheduled wrapper ──────────────────────────────────────────────────

exports.eventReminderCron = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    region: REGION,
    maxInstances: 2,
  },
  async (event) => {
    logger.info('eventReminderCron: starting run');
    const db = getFirestore('viralata');
    const result = await runEventReminder({ db, logger });
    logger.info('eventReminderCron: done', result);
    return null;
  },
);
