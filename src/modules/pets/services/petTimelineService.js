/**
 * @fileoverview petTimelineService — combina todos os eventos do pet em
 * uma timeline cronológica.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): agrega:
 *  - Registro inicial do pet
 *  - Mudanças de campos (do log)
 *  - Registros de saúde (vet_visits, treatments, medications)
 *  - Cuidados (care_log)
 *  - Histórico (devolutions, adopters_history)
 *  - Anotações (pet_notes)
 *  - Eventos do pet_audit_log
 *
 * Retorna uma lista ordenada por data (mais recente primeiro).
 */
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import {
  getDoc, getDocs, collection, query, orderBy, limit,
} from 'firebase/firestore';
import { listPetLog } from './petLogService';
import { listPetNotes } from './petNotesService';
import { listVetVisits } from './petMedicalService';
import { listTreatments } from './petMedicalService';
import { listCareLog } from './petMedicalService';
import { listMedications } from './petMedicalService';
import { listDevolutions } from './petHistoryService';
import { listAdoptersHistory } from './petHistoryService';
import { parseTimestamp } from '@/core/utils/timestamp';

const MAX_PER_SOURCE = 50;

/**
 * Combina todas as fontes de eventos do pet em uma timeline única.
 * @param {string} petId
 * @param {object} [pet] - pet em si (opcional, para created_at)
 * @returns {Promise<Array<{ id, type, date, title, description, icon, color, actor, data }>>}
 */
export async function getPetTimeline(petId, pet = null) {
  if (!db || !petId) return [];
  const events = [];

  try {
    // 1) Pet criado (do próprio doc)
    if (pet?.created_at) {
      const created = parseTimestamp(pet.created_at);
      if (created) {
        events.push({
          id: 'pet-created',
          type: 'pet_created',
          date: created,
          title: 'Pet cadastrado',
          description: pet.title || pet.name || 'Pet registrado na plataforma',
          icon: 'Sparkles',
          color: 'rose',
          actor: pet.created_by_name || 'Sistema',
        });
      }
    }

    // 2) Log imutável (todas as mudanças)
    const logs = await listPetLog(petId, 200);
    logs.forEach((log) => {
      const d = parseTimestamp(log.created_at);
      if (!d) return;
      events.push({
        id: `log-${log.id}`,
        type: log.action,
        date: d,
        title: actionLabel(log.action),
        description: actionDescription(log),
        icon: actionIcon(log.action),
        color: actionColor(log.action),
        actor: log.actor_name || 'Sistema',
        data: log.details,
      });
    });

    // 3) Anotações
    const notes = await listPetNotes(petId, 100);
    notes.forEach((note) => {
      const d = parseTimestamp(note.created_at);
      if (!d) return;
      events.push({
        id: `note-${note.id}`,
        type: 'note_created',
        date: d,
        title: 'Anotação',
        description: (note.text || '').slice(0, 200),
        icon: 'MessageSquare',
        color: 'sky',
        actor: note.author_name || 'Anônimo',
      });
    });

    // 4) Consultas veterinárias
    const visits = await listVetVisits(petId, MAX_PER_SOURCE);
    visits.forEach((v) => {
      const d = parseTimestamp(v.visit_date) || parseTimestamp(v.created_at);
      if (!d) return;
      events.push({
        id: `vet-${v.id}`,
        type: 'vet_visit',
        date: d,
        title: 'Consulta veterinária',
        description: v.reason || v.diagnosis || v.treatment || '—',
        icon: 'Stethoscope',
        color: 'emerald',
        actor: v.created_by_name || 'Sistema',
        data: v,
      });
    });

    // 5) Tratamentos
    const treatments = await listTreatments(petId, MAX_PER_SOURCE);
    treatments.forEach((t) => {
      const d = parseTimestamp(t.start_date) || parseTimestamp(t.created_at);
      if (!d) return;
      events.push({
        id: `treatment-${t.id}`,
        type: 'treatment',
        date: d,
        title: t.name || 'Tratamento iniciado',
        description: t.description || t.status || '—',
        icon: 'Pill',
        color: 'amber',
        actor: t.created_by_name || 'Sistema',
        data: t,
      });
    });

    // 6) Medicações
    const meds = await listMedications(petId, MAX_PER_SOURCE);
    meds.forEach((m) => {
      const d = parseTimestamp(m.start_date) || parseTimestamp(m.created_at);
      if (!d) return;
      events.push({
        id: `med-${m.id}`,
        type: 'medication',
        date: d,
        title: m.name || 'Medicação',
        description: m.dosage || m.frequency || '—',
        icon: 'Pill',
        color: 'rose',
        actor: m.created_by_name || 'Sistema',
        data: m,
      });
    });

    // 7) Cuidados
    const cares = await listCareLog(petId, MAX_PER_SOURCE);
    cares.forEach((c) => {
      const d = parseTimestamp(c.care_date) || parseTimestamp(c.created_at);
      if (!d) return;
      events.push({
        id: `care-${c.id}`,
        type: 'care',
        date: d,
        title: c.care_type || 'Cuidado',
        description: c.notes || '—',
        icon: 'Bath',
        color: 'sky',
        actor: c.created_by_name || 'Sistema',
        data: c,
      });
    });

    // 8) Devoluções
    const devolutions = await listDevolutions(petId, MAX_PER_SOURCE);
    devolutions.forEach((dev) => {
      const d = parseTimestamp(dev.return_date) || parseTimestamp(dev.created_at);
      if (!d) return;
      events.push({
        id: `devolution-${dev.id}`,
        type: 'devolution',
        date: d,
        title: 'Devolução registrada',
        description: (dev.reason || '').slice(0, 200),
        icon: 'RotateCcw',
        color: 'rose',
        actor: dev.created_by_name || 'Sistema',
        data: dev,
      });
    });

    // 9) Histórico de adotantes
    const adopters = await listAdoptersHistory(petId, MAX_PER_SOURCE);
    adopters.forEach((a) => {
      const d = parseTimestamp(a.start_date) || parseTimestamp(a.created_at);
      if (!d) return;
      events.push({
        id: `adopter-${a.id}`,
        type: 'adopter',
        date: d,
        title: a.adopter_name || 'Adotante',
        description: a.status || a.notes || 'Adotante registrado',
        icon: 'Users',
        color: 'emerald',
        actor: a.created_by_name || 'Sistema',
        data: a,
      });
    });
  } catch (err) {
    logger.error('[petTimeline] getPetTimeline falhou', err);
  }

  // Ordena por data decrescente
  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  return events;
}

const ACTION_LABELS = {
  pet_created: 'Pet cadastrado',
  pet_updated: 'Pet atualizado',
  pet_deleted: 'Pet removido',
  vet_visit_created: 'Consulta veterinária registrada',
  vet_visit_updated: 'Consulta atualizada',
  vet_visit_deleted: 'Consulta removida',
  treatment_created: 'Tratamento iniciado',
  treatment_updated: 'Tratamento atualizado',
  treatment_deleted: 'Tratamento removido',
  care_log_created: 'Cuidado registrado',
  care_log_updated: 'Cuidado atualizado',
  care_log_deleted: 'Cuidado removido',
  medication_created: 'Medicação registrada',
  medication_updated: 'Medicação atualizada',
  medication_deleted: 'Medicação removida',
  devolution_created: 'Devolução registrada',
  devolution_updated: 'Devolução atualizada',
  devolution_deleted: 'Devolução removida',
  adopter_history_created: 'Adotante registrado',
  adopter_history_updated: 'Adotante atualizado',
  adopter_history_deleted: 'Adotante removido',
  note_created: 'Anotação adicionada',
  note_deleted: 'Anotação removida',
};

const ACTION_ICONS = {
  pet_created: 'Sparkles',
  pet_updated: 'Edit',
  pet_deleted: 'Trash2',
  vet_visit_created: 'Stethoscope',
  vet_visit_updated: 'Stethoscope',
  vet_visit_deleted: 'Stethoscope',
  treatment_created: 'Pill',
  treatment_updated: 'Pill',
  treatment_deleted: 'Pill',
  care_log_created: 'Bath',
  care_log_updated: 'Bath',
  care_log_deleted: 'Bath',
  medication_created: 'Pill',
  medication_updated: 'Pill',
  medication_deleted: 'Pill',
  devolution_created: 'RotateCcw',
  devolution_updated: 'RotateCcw',
  devolution_deleted: 'RotateCcw',
  adopter_history_created: 'Users',
  adopter_history_updated: 'Users',
  adopter_history_deleted: 'Users',
  note_created: 'MessageSquare',
  note_deleted: 'MessageSquare',
};

const ACTION_COLORS = {
  pet_created: 'rose',
  pet_updated: 'sky',
  pet_deleted: 'slate',
  vet_visit_created: 'emerald',
  vet_visit_updated: 'emerald',
  vet_visit_deleted: 'slate',
  treatment_created: 'amber',
  treatment_updated: 'amber',
  treatment_deleted: 'slate',
  care_log_created: 'sky',
  care_log_updated: 'sky',
  care_log_deleted: 'slate',
  medication_created: 'rose',
  medication_updated: 'rose',
  medication_deleted: 'slate',
  devolution_created: 'rose',
  devolution_updated: 'rose',
  devolution_deleted: 'slate',
  adopter_history_created: 'emerald',
  adopter_history_updated: 'emerald',
  adopter_history_deleted: 'slate',
  note_created: 'sky',
  note_deleted: 'slate',
};

function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function actionIcon(action) {
  return ACTION_ICONS[action] || 'Circle';
}

function actionColor(action) {
  return ACTION_COLORS[action] || 'primary';
}

function actionDescription(log) {
  if (!log?.details) return '';
  const d = log.details;
  if (d.changed_fields && Array.isArray(d.changed_fields)) {
    return `Campos: ${d.changed_fields.join(', ')}`;
  }
  if (d.text_preview) return `"${d.text_preview}"`;
  if (d.reason_preview) return `Motivo: "${d.reason_preview}"`;
  if (d.name) return `${d.name}${d.dosage ? ` (${d.dosage})` : ''}`;
  return Object.keys(d).length > 0 ? JSON.stringify(d).slice(0, 120) : '';
}
