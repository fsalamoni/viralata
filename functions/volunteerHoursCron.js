/**
 * @fileoverview Cloud Function scheduled: agregação de horas de voluntários
 * + lembrete de turno (TASK-220).
 *
 * A lógica pura está em `volunteerHoursCronCore.js` (testável sem
 * dependência firebase-functions). Aqui ficam apenas os wrappers
 * `onSchedule` que conectam ao Firebase Functions runtime.
 *
 * Funções:
 *   1. aggregateVolunteerHours  — todo dia 02:00 UTC (23:00 BRT)
 *   2. sendShiftReminders       — a cada 60 minutos
 *
 * @see volunteerHoursCronCore.js
 */

'use strict';

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}

const {
  runAggregateVolunteerHours,
  runSendShiftReminders,
} = require('./volunteerHoursCronCore');

const REGION = 'southamerica-east1';

// ─── Cloud Function wrappers ─────────────────────────────────────────────

exports.aggregateVolunteerHours = onSchedule(
  {
    schedule: '0 2 * * *',   // 02:00 UTC = 23:00 BRT
    timeZone: 'UTC',
    region: REGION,
    maxInstances: 1,
  },
  async (event) => {
    logger.info('aggregateVolunteerHours: triggered');
    try {
      return await runAggregateVolunteerHours({ logger });
    } catch (err) {
      logger.error('aggregateVolunteerHours: unhandled', { error: String(err) });
      return null;
    }
  },
);

exports.sendShiftReminders = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    region: REGION,
    maxInstances: 2,
  },
  async (event) => {
    logger.info('sendShiftReminders: triggered');
    try {
      return await runSendShiftReminders({ logger });
    } catch (err) {
      logger.error('sendShiftReminders: unhandled', { error: String(err) });
      return null;
    }
  },
);
