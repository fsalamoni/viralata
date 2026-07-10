/**
 * @fileoverview Domínio: Gestão de Voluntários (Fase 13).
 *
 * Define o ciclo de vida de:
 *  - `volunteer_profile` (GLOBAL, subcoleção de `users/{userId}`) — perfil
 *    do voluntário com habilidades, certificações, disponibilidade.
 *  - `volunteer_participation` (multi-tenant, `clubs/{clubId}/...`) —
 *    cada participação em evento/exposição com check-in/out, horas e
 *    transporte prestado.
 *
 * Convenções herdadas de foster / postAdoption:
 *  - Schemas Zod `.strict()` (rejeita campos desconhecidos).
 *  - Enums SNAKE_UPPER (compatíveis com Firestore).
 *  - Labels pt-BR centralizados.
 *  - Helpers puros testáveis sem Firestore.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (voluntários)
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

/**
 * Papéis exercidos em uma participation (evento/exposição).
 *
 * - `carregamento`     → carga/descarga de materiais/animais no evento
 * - `transporte_ida`   → levou algum pet até o evento
 * - `transporte_volta` → trouxe algum pet do evento de volta
 * - `cuidador`         → cuidado direto com os animais durante o evento
 * - `recepcao`         → recepção de visitantes / adoção
 * - `outro`            → custom (definir via `role_label`)
 */
export const VOLUNTEER_ROLE = Object.freeze([
  'carregamento',
  'transporte_ida',
  'transporte_volta',
  'cuidador',
  'recepcao',
  'outro',
]);

/**
 * Dias da semana (ISO 8601 ordering: segunda → domingo).
 * Usado em `volunteer_profile.availability[]`.
 */
export const DAY_OF_WEEK = Object.freeze([
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
]);

/**
 * Catálogo de skills pré-definidas (string-livre também aceito).
 * Mantemos como string para simplicidade; o UI sugere a partir daqui.
 */
export const VOLUNTEER_SKILL_SUGGESTIONS = Object.freeze([
  'transporte',
  'cuidador_caes',
  'cuidador_gatos',
  'limpeza',
  'banho_tosa',
  'recepcao',
  'fotografia',
  'midia_social',
  'veterinario',
  'auxiliar_veterinario',
  'manutencao',
  'motorista',
  'organizacao_eventos',
  'captacao_recursos',
  'design_grafico',
  'traducao',
]);

// ─── Sub-schemas (perfil) ──────────────────────────────────────────────

const timeString = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d$/,
  'Horário deve estar no formato HH:MM (24h)',
);

const availabilitySlotSchema = z.object({
  day_of_week: z.enum(DAY_OF_WEEK),
  from: timeString,
  to: timeString,
}).strict().refine(
  (s) => s.from < s.to,
  { message: 'from deve ser menor que to', path: ['from'] },
);

const certificationSchema = z.object({
  name: z.string().min(2).max(200),
  issuer: z.string().max(200).optional(),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
}).strict();

// ─── Schema do perfil (GLOBAL) ─────────────────────────────────────────

/**
 * Schema do `volunteer_profile`. Subcoleção `users/{userId}/volunteer_profile/{profileId}`.
 *
 * O profile é GLOBAL: cada usuário tem no máximo 1 perfil de voluntário
 * (id canônico `main` ou UUID — ver service). O abrigo NÃO escreve aqui
 * diretamente; só lê (de forma derivada via participations).
 */
export const volunteerProfileSchema = z.object({
  id: z.string().min(1).max(128),
  user_id: z.string().min(1).max(128),            // redundante com path
  display_name: z.string().min(2).max(120),       // denormalized p/ busca
  skills: z.array(z.string().min(1).max(60)).max(30).default([]),
  certifications: z.array(certificationSchema).max(50).default([]),
  availability: z.array(availabilitySlotSchema).max(50).default([]),
  // Computed (zerados por padrão; Cloud Function futura pode preencher)
  hours_logged_total: z.number().min(0).default(0),
  transport_provided_count: z.number().int().min(0).default(0),
  transport_return_count: z.number().int().min(0).default(0),
  events_attended: z.array(z.string().min(1).max(128)).max(500).default([]),
  notes: z.string().max(2000).optional(),
  active: z.boolean().default(true),              // soft opt-out
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by: z.string().max(128).optional(),
}).strict();

/**
 * Schema para criar o perfil pela primeira vez. `user_id` é obrigatório
 * (deve bater com o path `users/{userId}`).
 */
export const createVolunteerProfileSchema = z.object({
  user_id: z.string().min(1).max(128),
  display_name: z.string().min(2).max(120),
  skills: z.array(z.string().min(1).max(60)).max(30).default([]),
  certifications: z.array(certificationSchema).max(50).default([]),
  availability: z.array(availabilitySlotSchema).max(50).default([]),
  notes: z.string().max(2000).optional(),
  active: z.boolean().default(true),
}).strict();

/**
 * Schema para update parcial. Nenhum campo é obrigatório. Para limpar um
 * campo, o service detecta `null` e aplica `deleteField()`.
 */
export const updateVolunteerProfileSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  skills: z.array(z.string().min(1).max(60)).max(30).optional(),
  certifications: z.array(certificationSchema).max(50).optional(),
  availability: z.array(availabilitySlotSchema).max(50).optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
}).strict();

// ─── Schema de participation (multi-tenant) ───────────────────────────

/**
 * Schema da participation. `clubs/{clubId}/volunteer_participation/{participationId}`.
 *
 * - `volunteer_uid`     FK → users/{uid} (dono do volunteer_profile)
 * - `exhibition_id`     FK → clubs/{clubId}/exhibitions/{exhId} (nullable por ora — Fase 10/11)
 * - `shelter_club_id`   redundante com path
 * - `check_in`/`check_out`  Timestamps; `hours_logged` é derivado
 * - `transport_provided`    boolean simplificado (ida + volta cobrem
 *   cases granulares via `role` no array de stats)
 */
export const volunteerParticipationSchema = z.object({
  id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  volunteer_name: z.string().min(2).max(120),   // denormalized p/ listas
  exhibition_id: z.string().min(1).max(128).nullable().default(null),
  shelter_club_id: z.string().min(1).max(128),
  role: z.enum(VOLUNTEER_ROLE),
  role_label: z.string().max(120).optional(),   // custom p/ role=outro
  check_in: z.unknown().nullable().default(null),   // Firestore Timestamp
  check_out: z.unknown().nullable().default(null),  // Firestore Timestamp
  hours_logged: z.number().min(0).default(0),
  transport_provided: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by: z.string().max(128).optional(),
}).strict();

/**
 * Schema para criar uma participation. `exhibition_id` é nullable.
 */
export const createVolunteerParticipationSchema = z.object({
  volunteer_uid: z.string().min(1).max(128),
  volunteer_name: z.string().min(2).max(120),
  exhibition_id: z.string().min(1).max(128).nullable().optional(),
  shelter_club_id: z.string().min(1).max(128),
  role: z.enum(VOLUNTEER_ROLE),
  role_label: z.string().max(120).optional(),
  transport_provided: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Schema para update parcial da participation. Só campos editáveis
 * pós-criação (não dá pra trocar volunteer_uid nem shelter_club_id).
 */
export const updateVolunteerParticipationSchema = z.object({
  exhibition_id: z.string().min(1).max(128).nullable().optional(),
  role: z.enum(VOLUNTEER_ROLE).optional(),
  role_label: z.string().max(120).optional(),
  check_in: z.unknown().nullable().optional(),
  check_out: z.unknown().nullable().optional(),
  hours_logged: z.number().min(0).optional(),
  transport_provided: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

// ─── Helpers (puros) ───────────────────────────────────────────────────

/**
 * Calcula horas decimais entre dois Timestamps (ou Date / string ISO).
 * Retorna 0 se entrada inválida ou check_out ausente.
 *
 * @param {Date|Timestamp|string|null|undefined} checkIn
 * @param {Date|Timestamp|string|null|undefined} checkOut
 * @returns {number} horas decimais (arredondadas p/ 2 casas)
 */
export function computeHoursLogged(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = toDate(checkIn);
  const b = toDate(checkOut);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  if (ms <= 0) return 0;
  const hours = ms / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Aceita Firestore Timestamp (com toDate), Date, string ISO, ou epoch ms.
 * Retorna Date ou null.
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try { return value.toDate(); } catch { return null; }
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  return null;
}

/**
 * Resumo agregado das participações de um voluntário.
 *
 * @param {Array<object>} participations  lista de volunteer_participation
 * @returns {{
 *   hoursTotal: number,
 *   participationsCount: number,
 *   transportOutbound: number,   // # participations com role=transporte_ida
 *   transportReturn: number,     // # participations com role=transporte_volta
 *   byRole: Record<string, number>,
 * }}
 */
export function summarizeVolunteerStats(participations) {
  const out = {
    hoursTotal: 0,
    participationsCount: 0,
    transportOutbound: 0,
    transportReturn: 0,
    byRole: {},
  };
  if (!Array.isArray(participations) || participations.length === 0) return out;

  for (const p of participations) {
    if (!p) continue;
    out.participationsCount += 1;
    const h = typeof p.hours_logged === 'number' ? p.hours_logged : computeHoursLogged(p.check_in, p.check_out);
    out.hoursTotal += h;
    const role = p.role || 'outro';
    out.byRole[role] = (out.byRole[role] || 0) + 1;
    if (role === 'transporte_ida') out.transportOutbound += 1;
    if (role === 'transporte_volta') out.transportReturn += 1;
  }
  out.hoursTotal = Math.round(out.hoursTotal * 100) / 100;
  return out;
}

/**
 * Verifica se o voluntário está disponível no dia/horário informados.
 * Considera TODOS os slots de availability que batem com o dia (se
 * múltiplos, basta um deles cobrir o horário).
 *
 * @param {Array<{day_of_week: string, from: string, to: string}>} availability
 * @param {string} dayOfWeek  ex.: 'saturday'
 * @param {string} time       HH:MM (24h)
 * @returns {boolean}
 */
export function isVolunteerAvailableAt(availability, dayOfWeek, time) {
  if (!Array.isArray(availability) || availability.length === 0) return false;
  if (!DAY_OF_WEEK.includes(dayOfWeek)) return false;
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return false;

  return availability.some((slot) => {
    if (!slot || slot.day_of_week !== dayOfWeek) return false;
    return time >= slot.from && time <= slot.to;
  });
}

/**
 * Verifica se a participation tem check_in E check_out preenchidos.
 */
export function participationIsComplete(p) {
  if (!p) return false;
  return Boolean(p.check_in) && Boolean(p.check_out);
}

/**
 * Filtra participações por pelo menos uma skill.
 * Helper usado pelo UI; puro.
 *
 * @param {Array<object>} profiles
 * @param {string|string[]} skills  skill ou lista de skills (OR)
 * @returns {Array<object>}
 */
export function filterProfilesBySkills(profiles, skills) {
  if (!Array.isArray(profiles) || profiles.length === 0) return [];
  const want = (Array.isArray(skills) ? skills : [skills])
    .filter((s) => typeof s === 'string' && s.length > 0);
  if (want.length === 0) return profiles;
  return profiles.filter((p) => {
    const have = Array.isArray(p?.skills) ? p.skills : [];
    return want.some((s) => have.includes(s));
  });
}

// ─── Labels pt-BR ──────────────────────────────────────────────────────

export const VOLUNTEER_ROLE_LABELS = Object.freeze({
  carregamento: 'Carregamento',
  transporte_ida: 'Transporte (ida)',
  transporte_volta: 'Transporte (volta)',
  cuidador: 'Cuidador de animais',
  recepcao: 'Recepção',
  outro: 'Outro',
});

export const DAY_OF_WEEK_LABELS = Object.freeze({
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
});
