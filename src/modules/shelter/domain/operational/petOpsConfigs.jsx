/**
 * @fileoverview petOpsConfigs — definição declarativa das 7 tabelas
 * operacionais do abrigo (SHELTER_PET_OPS_TABLES_V1).
 *
 * Cada config descreve: título, campo de data nativo, ícone, funções de
 * serviço (list/create/update/delete por-pet), campos do formulário de
 * registro e colunas da tabela. O container `PetOpsTab` e o form genérico
 * `PetOpsForm` consomem estes configs — nada de código duplicado por aba.
 */
import { Pill, Stethoscope, Bandage, Syringe, Sparkles, HeartHandshake, Undo2 } from 'lucide-react';
import {
  listVetVisits, createVetVisit, updateVetVisit, deleteVetVisit,
  listTreatments, createTreatment, updateTreatment, deleteTreatment,
  listCareLog, createCareLog, updateCareLog, deleteCareLog,
  listMedications, createMedication, updateMedication, deleteMedication,
} from '@/modules/pets/services/petMedicalService';
import {
  listDevolutions, createDevolution, updateDevolution, deleteDevolution,
  listAdoptersHistory, createAdopterHistory, updateAdopterHistory, deleteAdopterHistory,
} from '@/modules/pets/services/petHistoryService';
import {
  listHealthRecords, createHealthRecord, updateHealthRecord, deleteHealthRecord,
  HEALTH_RECORD_TYPE_LABELS,
} from '@/modules/pets/services/petHealthRecordsService';

// ── Option sets (value → label) ─────────────────────────────────────────
const TREATMENT_STATUS = { in_progress: 'Em andamento', completed: 'Concluído', paused: 'Pausado', cancelled: 'Cancelado' };
const CARE_TYPES = { bath: 'Banho', grooming: 'Tosa', brushing: 'Escovação', dental: 'Dental', nails: 'Unhas', deshedding: 'Deslanugem', exercise: 'Exercício', other: 'Outro' };
const ADOPTION_STATUS = { active: 'Vigente', completed: 'Concluída', returned: 'Devolvida', ended: 'Encerrada' };
const DEVOLUTION_CATEGORY = { health: 'Saúde', behavior: 'Comportamento', allergy: 'Alergia', moving: 'Mudança', financial: 'Financeiro', incompatibility: 'Incompatibilidade', other: 'Outro' };

const toOptions = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));
const labelOf = (map, v) => map[v] || v || '—';
const truncate = (s, n = 60) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…` : (s || '—'));

/**
 * Configs indexados por chave de sub-aba.
 * @type {Record<string, object>}
 */
export const PET_OPS_CONFIGS = {
  medications: {
    key: 'medications',
    tabKey: 'ops_medications',
    title: 'Medicações',
    icon: Pill,
    dateField: 'start_date',
    dateLabel: 'Início',
    emptyHint: 'Nenhuma medicação registrada para os pets deste abrigo.',
    listFn: listMedications,
    createFn: createMedication,
    updateFn: updateMedication,
    deleteFn: deleteMedication,
    fields: [
      { name: 'name', label: 'Medicação', type: 'text', required: true, placeholder: 'Ex.: Dipirona' },
      { name: 'dosage', label: 'Dose', type: 'text', placeholder: 'Ex.: 1 comprimido' },
      { name: 'frequency', label: 'Frequência', type: 'text', placeholder: 'Ex.: 12/12h' },
      { name: 'start_date', label: 'Início', type: 'date', required: true },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Medicação', render: (r) => r.name || '—' },
      { key: 'dosage', label: 'Dose', render: (r) => r.dosage || '—' },
      { key: 'frequency', label: 'Frequência', render: (r) => r.frequency || '—' },
    ],
  },

  vet_visits: {
    key: 'vet_visits',
    tabKey: 'ops_vet_visits',
    title: 'Consultas veterinárias',
    icon: Stethoscope,
    dateField: 'visit_date',
    dateLabel: 'Data',
    emptyHint: 'Nenhuma consulta veterinária registrada para os pets deste abrigo.',
    listFn: listVetVisits,
    createFn: createVetVisit,
    updateFn: updateVetVisit,
    deleteFn: deleteVetVisit,
    fields: [
      { name: 'reason', label: 'Motivo', type: 'text', required: true, placeholder: 'Ex.: Consulta de rotina' },
      { name: 'vet_name', label: 'Veterinário(a)', type: 'text' },
      { name: 'vet_clinic', label: 'Clínica', type: 'text' },
      { name: 'diagnosis', label: 'Diagnóstico', type: 'text' },
      { name: 'treatment', label: 'Conduta/Tratamento', type: 'textarea' },
      { name: 'visit_date', label: 'Data', type: 'date', required: true },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'reason', label: 'Motivo', render: (r) => truncate(r.reason) },
      { key: 'vet_name', label: 'Veterinário', render: (r) => r.vet_name || '—' },
      { key: 'diagnosis', label: 'Diagnóstico', render: (r) => truncate(r.diagnosis, 40) },
    ],
  },

  treatments: {
    key: 'treatments',
    tabKey: 'ops_treatments',
    title: 'Tratamentos',
    icon: Bandage,
    dateField: 'start_date',
    dateLabel: 'Início',
    emptyHint: 'Nenhum tratamento registrado para os pets deste abrigo.',
    listFn: listTreatments,
    createFn: createTreatment,
    updateFn: updateTreatment,
    deleteFn: deleteTreatment,
    fields: [
      { name: 'name', label: 'Tratamento', type: 'text', required: true, placeholder: 'Ex.: Sarna' },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'status', label: 'Situação', type: 'select', options: toOptions(TREATMENT_STATUS), defaultValue: 'in_progress' },
      { name: 'start_date', label: 'Início', type: 'date', required: true },
      { name: 'end_date', label: 'Fim (opcional)', type: 'date' },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Tratamento', render: (r) => r.name || '—' },
      { key: 'description', label: 'Descrição', render: (r) => truncate(r.description) },
      { key: 'status', label: 'Situação', render: (r) => labelOf(TREATMENT_STATUS, r.status) },
    ],
  },

  health_records: {
    key: 'health_records',
    tabKey: 'ops_health_records',
    title: 'Vacinas e vermifugação',
    icon: Syringe,
    dateField: 'application_date',
    dateLabel: 'Aplicação',
    emptyHint: 'Nenhuma vacina/vermifugação registrada para os pets deste abrigo.',
    listFn: listHealthRecords,
    createFn: createHealthRecord,
    updateFn: updateHealthRecord,
    deleteFn: deleteHealthRecord,
    fields: [
      { name: 'type', label: 'Tipo', type: 'select', options: toOptions(HEALTH_RECORD_TYPE_LABELS), defaultValue: 'vaccine', required: true },
      { name: 'name', label: 'Vacina/Produto', type: 'text', required: true, placeholder: 'Ex.: V10, Vermífugo' },
      { name: 'application_date', label: 'Aplicação', type: 'date', required: true },
      { name: 'dose', label: 'Dose', type: 'text', placeholder: 'Ex.: 1ª dose' },
      { name: 'vet_name', label: 'Aplicado por', type: 'text' },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'type', label: 'Tipo', render: (r) => labelOf(HEALTH_RECORD_TYPE_LABELS, r.type) },
      { key: 'name', label: 'Vacina/Produto', render: (r) => r.name || '—' },
      { key: 'dose', label: 'Dose', render: (r) => r.dose || '—' },
    ],
  },

  care_log: {
    key: 'care_log',
    tabKey: 'ops_care_log',
    title: 'Cuidados',
    icon: Sparkles,
    dateField: 'care_date',
    dateLabel: 'Data',
    emptyHint: 'Nenhum cuidado registrado para os pets deste abrigo.',
    listFn: listCareLog,
    createFn: createCareLog,
    updateFn: updateCareLog,
    deleteFn: deleteCareLog,
    fields: [
      { name: 'care_type', label: 'Tipo de cuidado', type: 'select', options: toOptions(CARE_TYPES), defaultValue: 'bath', required: true },
      { name: 'care_date', label: 'Data', type: 'date', required: true },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'care_type', label: 'Tipo', render: (r) => labelOf(CARE_TYPES, r.care_type) },
      { key: 'notes', label: 'Observações', render: (r) => truncate(r.notes) },
    ],
  },

  adopters_history: {
    key: 'adopters_history',
    tabKey: 'ops_adoptions',
    title: 'Adoções',
    icon: HeartHandshake,
    dateField: 'start_date',
    dateLabel: 'Início',
    emptyHint: 'Nenhuma adoção registrada para os pets deste abrigo.',
    listFn: listAdoptersHistory,
    createFn: createAdopterHistory,
    updateFn: updateAdopterHistory,
    deleteFn: deleteAdopterHistory,
    fields: [
      { name: 'adopter_name', label: 'Adotante', type: 'text', required: true },
      { name: 'status', label: 'Situação', type: 'select', options: toOptions(ADOPTION_STATUS), defaultValue: 'active' },
      { name: 'start_date', label: 'Início', type: 'date', required: true },
      { name: 'end_date', label: 'Fim (opcional)', type: 'date' },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'adopter_name', label: 'Adotante', render: (r) => r.adopter_name || '—' },
      { key: 'status', label: 'Situação', render: (r) => labelOf(ADOPTION_STATUS, r.status) },
    ],
  },

  devolutions: {
    key: 'devolutions',
    tabKey: 'ops_devolutions',
    title: 'Devoluções',
    icon: Undo2,
    dateField: 'devolution_date',
    dateLabel: 'Data',
    emptyHint: 'Nenhuma devolução registrada para os pets deste abrigo.',
    listFn: listDevolutions,
    createFn: createDevolution,
    updateFn: updateDevolution,
    deleteFn: deleteDevolution,
    fields: [
      { name: 'reason', label: 'Motivo', type: 'textarea', required: true, placeholder: 'Descreva o motivo (mín. 10 caracteres)' },
      { name: 'reason_category', label: 'Categoria', type: 'select', options: toOptions(DEVOLUTION_CATEGORY), defaultValue: 'other' },
      { name: 'devolution_date', label: 'Data', type: 'date', required: true },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { key: 'reason', label: 'Motivo', render: (r) => truncate(r.reason) },
      { key: 'reason_category', label: 'Categoria', render: (r) => labelOf(DEVOLUTION_CATEGORY, r.reason_category) },
    ],
  },
};

/** Ordem das sub-abas operacionais (após "Pets"). */
export const PET_OPS_TAB_ORDER = [
  'medications',
  'vet_visits',
  'treatments',
  'health_records',
  'care_log',
  'adopters_history',
  'devolutions',
];
