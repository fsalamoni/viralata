/**
 * Domínio: Animal (núcleo do sistema de gestão do abrigo).
 *
 * Define o "Cadastro Único" do animal — a parte que segue o animal
 * independentemente do abrigo (Fase 1). Os dados clínicos, operacionais e
 * legais vivem em sub-coleções e são *tenant-specific* (veja seção 11.1 do
 * docs/SHELTER_MGMT_ROADMAP.md).
 *
 * Princípios:
 * 1. Append-only: nunca deletar/renomear campo. Migrações sempre aditivas.
 * 2. Soft-delete: nunca apagar; marcar `deleted_at`. Hardware purge em 30d.
 * 3. Backward-compat: campos novos são opcionais; leitores toleram ausência.
 * 4. Defesa em profundidade: schema aqui + service + Firestore rules.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 1 + § 11.1 (multi-tenant)
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

/**
 * Tipo de entrada do animal no abrigo.
 * `rescue` (carreira/fiscalização/denúncia), `born` (nasceu no abrigo),
 * `transfer` (veio de outro abrigo), `surrender` (entregue pelo tutor),
 * `purchase` (compra — raro, mas em abrigos que resgatam de canis comerciais).
 */
export const INTAKE_TYPES = Object.freeze([
  'rescue',
  'born',
  'transfer',
  'surrender',
  'purchase',
]);

/**
 * Status Asilomar — padrão internacional de categorização de saúde animal
 * em abrigos. Adotado por Petfinder, Maddie's Fund, ASPCA. Documentado em:
 * https://www.shelteranimalscount.org/what-is-asilomar
 */
export const ASILOMAR_STATUSES = Object.freeze([
  'healthy',                  // Saudável no momento da entrada
  'treatable_rehabilitatable',// Tratável e rehabilitável
  'treatable_manageable',     // Tratável mas requer manejo contínuo
  'unhealthy_untreatable',    // Doente sem possibilidade terapêutica
  'undetermined',             // Não avaliado ainda
]);

/**
 * Localização física ATUAL do animal (interno do abrigo). Diferente do
 * `status` (disponível/adotado): descreve ONDE o animal está agora.
 */
export const CURRENT_LOCATIONS = Object.freeze([
  'shelter',    // Em abrigo
  'foster',     // Em lar temporário
  'clinic',     // Em clínica veterinária
  'transport',  // Em transporte
  'unknown',    // Paradeiro desconhecido
  'other',      // Outros (detalhar em current_location_notes)
]);

/** Rótulos PT-BR das localizações atuais. */
export const CURRENT_LOCATION_LABELS = Object.freeze({
  shelter: 'Em abrigo',
  foster: 'Em lar temporário',
  clinic: 'Em clínica',
  transport: 'Em transporte',
  unknown: 'Paradeiro desconhecido',
  other: 'Outros',
});

// ─── Schemas Zod (validação client + service) ───────────────────────────

/**
 * Local de resgate/endereço. Schema livre (não amarrado a serviço de
 * geocoding específico — Fase 1 não depende de lat/lng externo).
 */
const rescueLocationSchema = z.object({
  description: z.string().max(280).optional(),
  city: z.string().max(80).optional(),
  state: z.string().length(2).optional(), // UF brasileiro
  lat: z.number().min(-90).max(90).optional(),   // GPS (opcional)
  lng: z.number().min(-180).max(180).optional(),
  source: z.enum(['manual', 'geocoded', 'shared_link', 'device_gps']).default('manual'),
}).strict();

/**
 * Foto do resgate (interna do abrigo). A visibilidade decide se a foto pode
 * aparecer na página pública do pet (`public`) ou fica só para a equipe
 * (`internal`, default). A decisão é editável.
 */
const rescuePhotoSchema = z.object({
  url: z.string().url(),
  storage_path: z.string().max(500).optional(),
  thumb_url: z.string().url().optional(),
  visibility: z.enum(['public', 'internal']).default('internal'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  caption: z.string().max(200).optional(),
  uploaded_by_uid: z.string().max(128).optional(),
  uploaded_at: z.string().datetime().optional(),
}).strict();

/**
 * Cross-posting: links para outras plataformas (Petfinder, Adoção Responsável,
 * grupos de Facebook, etc). Cada abrigo gerencia os seus.
 */
const crossPostingSchema = z.object({
  petfinder_url: z.string().url().optional(),
  rescuegroups_url: z.string().url().optional(),
  facebook_url: z.string().url().optional(),
  other_urls: z.array(z.string().url()).max(10).default([]),
}).strict();

/**
 * Schema principal do Cadastro Único. Todos os campos da Fase 1 são
 * OPCIONAIS (não quebrar pets legados). O `petService.sanitizePet` aceita
 * docs antigos sem esses campos e adiciona defaults.
 */
export const shelterAnimalProfileSchema = z.object({
  // Identificação do resgate
  rescue_number: z.string().max(20).optional(),             // Sequencial do abrigo (ex: C-00001/26)
  rescue_name: z.string().min(1).max(80).optional(),       // Nome/título do resgate (dado pelo resgatante)
  rescue_date: z.string().datetime().optional(),            // ISO 8601
  rescue_by_uid: z.string().max(128).optional(),            // Quem resgatou (user.uid)
  rescue_by_name: z.string().max(80).optional(),            // Snapshots: nome de quem resgatou
  rescue_responsible_name: z.string().max(120).optional(),  // Responsável pelo resgate (nome livre)
  rescue_location: rescueLocationSchema.optional(),
  rescue_photos: z.array(rescuePhotoSchema).max(30).optional(), // Fotos do resgate (internas por padrão)

  // Identificação física
  birth_date: z.string().optional(),                        // Data de nascimento (YYYY-MM-DD ou ISO), se conhecida
  microchip_id: z.string().regex(/^[0-9]{15}$/, 'Microchip deve ter 15 dígitos (ISO 11784/11785)').optional(),

  // Situação operacional interna
  status_changed_at: z.string().datetime().optional(),      // Data da última mudança de status
  current_location: z.enum(CURRENT_LOCATIONS).optional(),   // Onde o animal está agora
  current_location_notes: z.string().max(280).optional(),   // Detalhe da localização atual
  legal_process_number: z.string().max(60).optional(),      // Processo judicial (vazio se não houver)
  observations: z.string().max(2000).optional(),            // Observações internas

  // Tipo de entrada
  intake_type: z.enum(INTAKE_TYPES).optional(),
  intake_subtype: z.string().max(80).optional(),            // ex: "atroz", "carreira", "ninhada"
  intake_notes: z.string().max(2000).optional(),            // Notas de quem recebeu

  // Status Asilomar (avaliação inicial)
  asilomar_status: z.enum(ASILOMAR_STATUSES).default('undetermined'),
  asilomar_evaluated_at: z.string().datetime().optional(),
  asilomar_evaluated_by_uid: z.string().max(128).optional(),

  // Multi-tenant (Fase 1 inclui este campo; regras de tenancy aplicadas em Fases 2+)
  shelter_owner_club_id: z.string().max(128).optional(),    // shelter (ONG) que possui o animal

  // Cross-posting
  cross_posting: crossPostingSchema.optional(),

  // Status vital (Fase 1 inclui; funcionalidade de óbito só virá em Fase 8/21)
  deceased_at: z.string().datetime().optional(),
  death_cause: z.string().max(280).optional(),

  // Auditoria
  shelter_profile_updated_at: z.string().datetime().optional(),
  shelter_profile_updated_by_uid: z.string().max(128).optional(),
}).strict();

/**
 * Versão "merge" do schema de pet. Aceita pets legados (campos novos
 * opcionais) + pets com perfil de abrigo completo. Usado em
 * `petService.sanitizePet` para garantir que QUALQUER doc do Firestore
 * passa pela validação sem quebrar.
 */
export const shelterAnimalProfileUpdateSchema = shelterAnimalProfileSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Default values para os campos novos. Aplicado em pets que não têm o
 * perfil de abrigo (backfill da Fase 1).
 */
export const SHELTER_ANIMAL_PROFILE_DEFAULTS = Object.freeze({
  asilomar_status: 'undetermined',
  shelter_profile_updated_at: null,
});

/**
 * Indica se o pet tem um perfil de abrigo preenchido (≥1 campo
 * significativo). Usado para esconder/mostrar a aba "Cadastro".
 */
export function hasShelterProfile(pet) {
  if (!pet) return false;
  return Boolean(
    pet.rescue_number ||
    pet.rescue_date ||
    pet.rescue_by_uid ||
    pet.microchip_id ||
    pet.intake_type ||
    pet.current_location ||
    pet.shelter_owner_club_id,
  );
}

// ─── Número de resgate (sequencial por abrigo/espécie/ano) ───────────────

/**
 * Código de espécie de 1 letra para o número de resgate (ex: C para cão).
 * Normaliza acentos/caixa. Default 'A' (animal) para espécies desconhecidas.
 * @param {string} species
 * @returns {string} 1 letra maiúscula
 */
export function speciesRescueCode(species) {
  const s = String(species || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
  if (!s) return 'A';
  // Gato/cat/felino ANTES de cão: 'cat' (inglês) começa com 'ca' e cairia no
  // ramo do cachorro por engano.
  if (s === 'cat' || s.startsWith('ga') || s.startsWith('fel')) return 'G';  // gato/cat/felino
  if (s === 'dog' || s.startsWith('ca') || s.startsWith('cão')) return 'C';  // cão/cachorro/dog
  return s[0].toUpperCase();
}

/**
 * Formata o número de resgate: `${code}-${seq(5)}/${YY}` → "C-00001/26".
 * @param {string} code letra da espécie
 * @param {number} seq sequência (>=1)
 * @param {number|Date|string} year ano do resgate (default: ano atual)
 * @returns {string}
 */
export function formatRescueNumber(code, seq, year = new Date()) {
  const y = year instanceof Date
    ? year.getFullYear()
    : (typeof year === 'string' ? new Date(year).getFullYear() : Number(year));
  const yy = String(y % 100).padStart(2, '0');
  const n = String(Math.max(1, Number(seq) || 1)).padStart(5, '0');
  return `${code}-${n}/${yy}`;
}

/**
 * Dias que o animal está no abrigo: da data de resgate/entrada até hoje —
 * ou até a data do status, se já saiu (adotado/óbito). Retorna null sem data
 * de referência.
 * @param {object} pet
 * @param {Date} [now]
 * @returns {number|null}
 */
export function daysInShelter(pet, now = new Date()) {
  if (!pet) return null;
  const startIso = pet.rescue_date || pet.created_at_iso || null;
  if (!startIso) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const left = pet.status === 'adopted' || pet.deceased_at
    ? new Date(pet.status_changed_at || pet.deceased_at || now)
    : now;
  const end = Number.isNaN(left.getTime()) ? now : left;
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Compara dois perfis para detectar mudanças (audit log). Retorna lista
 * de campos alterados com old/new.
 */
export function diffShelterProfile(oldPet, newPet) {
  const fields = [
    'rescue_number', 'rescue_name', 'rescue_date', 'rescue_by_uid', 'rescue_by_name',
    'rescue_responsible_name', 'birth_date',
    'microchip_id', 'intake_type', 'intake_subtype', 'asilomar_status',
    'status_changed_at', 'current_location', 'current_location_notes',
    'legal_process_number', 'observations',
    'shelter_owner_club_id', 'deceased_at', 'death_cause',
  ];
  const changes = [];
  for (const f of fields) {
    const oldVal = oldPet?.[f] ?? null;
    const newVal = newPet?.[f] ?? null;
    if (oldVal !== newVal) {
      changes.push({ field: f, from: oldVal, to: newVal });
    }
  }
  return changes;
}
