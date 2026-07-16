/**
 * @fileoverview Search Sync — TASK-312
 *
 * Cloud Functions v2 que mantém coleções denormalizadas de busca
 * (search_pets, search_clubs, search_fosters, search_volunteers) em sync
 * com os documentos fonte. Permite prefix-match e booleanas sem depender
 * de client-side filtering pesado.
 *
 * Cada documento no índice contém:
 *   - Campos normalizados (_lower, _tokens) para busca prefix/contains
 *   - ID original + shelter_club_id para ACL e construção de links
 *   - Campos de display básicos (name, photo, status)
 *
 * Segurança: apenas Admin SDK escreve nestas coleções (as rules bloqueiam
 * write para não-admin). Reads seguem as regras de acesso da plataforma.
 */

'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');
const { logger } = require('firebase-functions');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

// Inicializa app lazy para evitar "default Firebase app does not exist" quando
// este módulo é required antes do index.js chamar initializeApp().
if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
const db = getFirestore(DATABASE_ID);

// ─── Helpers de normalização ────────────────────────────────────────────

/**
 * Normaliza texto: lowercase + remove acentos.
 * Equivalente ao normalizeText() do search domain (src/modules/shelter/domain/search/search.js).
 */
function normalizeText(text) {
  if (text == null) return '';
  if (typeof text !== 'string') return String(text);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += ACCENT_MAP[ch] ?? ch;
  }
  return out.toLowerCase();
}

const ACCENT_MAP = {
  á: 'a', à: 'a', ã: 'a', â: 'a', ä: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', õ: 'o', ô: 'o', ö: 'o', ø: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ñ: 'n', ç: 'c', ý: 'y', ÿ: 'y',
  æ: 'ae', œ: 'oe', ß: 'ss',
  Á: 'a', À: 'a', Ã: 'a', Â: 'a', Ä: 'a', Å: 'a',
  É: 'e', È: 'e', Ê: 'e', Ë: 'e',
  Í: 'i', Ì: 'i', Î: 'i', Ï: 'i',
  Ó: 'o', Ò: 'o', Õ: 'o', Ô: 'o', Ö: 'o', Ø: 'o',
  Ú: 'u', Ù: 'u', Û: 'u', Ü: 'u',
  Ñ: 'n', Ç: 'c', Ý: 'y',
  Æ: 'ae', Œ: 'oe',
};

/**
 * Tokeniza texto: normaliza e divide em tokens de ≥2 chars.
 */
function tokenize(text) {
  if (!text) return [];
  return normalizeText(text)
    .split(/[^a-z0-9]+/g)
    .filter((t) => t && (t.length > 1 || /^\d+$/.test(t)));
}

/**
 * Gera array de prefixos a partir de um token (3-5 chars).
 * Usado para queries "starts with" no Firestore.
 */
function buildPrefixes(text, minLen = 3, maxLen = 5) {
  const n = normalizeText(text);
  const prefixes = [];
  for (let i = minLen; i <= maxLen && i <= n.length; i++) {
    prefixes.push(n.slice(0, i));
  }
  return prefixes;
}

// ─── Builders de documento de índice ────────────────────────────────────

function buildPetSearchDoc(pet) {
  if (!pet) return null;
  const name = pet.name || pet.title || '';
  const breed = pet.breed || '';
  const city = pet.city || '';
  const state = pet.state || '';
  const nameTokens = tokenize(name);
  const breedTokens = tokenize(breed);

  return {
    // IDs e tenancy
    id: pet.id || null,
    shelter_club_id: pet.shelter_club_id || null,
    owner_id: pet.owner_id || null,
    // Display
    name,
    name_lower: normalizeText(name),
    species: pet.species || null,
    breed,
    breed_tokens: breedTokens,
    size: pet.size || null,
    status: pet.status || null,
    photos: Array.isArray(pet.photos) ? pet.photos.filter(Boolean).slice(0, 1) : [],
    // Location
    city,
    state,
    location: [city, state].filter(Boolean).join(', '),
    location_lower: normalizeText([city, state].filter(Boolean).join(', ')),
    // Timestamps
    created_at: pet.created_at || null,
    updated_at: pet.updated_at || null,
    // Prefix tokens (para starts-with via >= + <)
    name_prefix_3: buildPrefixes(name, 3, 3),
    name_prefix_4: buildPrefixes(name, 4, 4),
    name_prefix_5: buildPrefixes(name, 5, 5),
    breed_prefix_3: buildPrefixes(breed, 3, 3),
    breed_prefix_4: buildPrefixes(breed, 4, 4),
    breed_prefix_5: buildPrefixes(breed, 5, 5),
  };
}

function buildClubSearchDoc(club) {
  if (!club) return null;
  const name = club.name || '';
  const city = club.city || '';
  const state = club.state || '';
  const description = club.description || '';

  return {
    id: club.id || null,
    directory_status: club.directory_status || null,
    // Display
    name,
    name_lower: normalizeText(name),
    city,
    state,
    logo_url: club.logo_url || null,
    // Location
    location_lower: normalizeText([city, state].filter(Boolean).join(', ')),
    // Tokens
    name_tokens: tokenize(name),
    description_tokens: tokenize(description),
    city_tokens: tokenize(city),
    // Prefix
    name_prefix_3: buildPrefixes(name, 3, 3),
    name_prefix_4: buildPrefixes(name, 4, 4),
    name_prefix_5: buildPrefixes(name, 5, 5),
    // Timestamps
    created_at: club.created_at || null,
    updated_at: club.updated_at || null,
  };
}

function buildFosterSearchDoc(foster) {
  if (!foster) return null;
  const fullName = foster.full_name || '';
  const address = foster.address || '';
  const city = foster.city || '';
  const state = foster.state || '';

  return {
    id: foster.id || null,
    shelter_club_id: foster.shelter_club_id || null,
    foster_uid: foster.foster_uid || null,
    // Display
    full_name: fullName,
    full_name_lower: normalizeText(fullName),
    phone: foster.phone || null,
    address,
    city,
    state,
    status: foster.status || null,
    // Tokens
    name_tokens: tokenize(fullName),
    address_tokens: tokenize(address),
    city_tokens: tokenize(city),
    // Prefix
    name_prefix_3: buildPrefixes(fullName, 3, 3),
    name_prefix_4: buildPrefixes(fullName, 4, 4),
    name_prefix_5: buildPrefixes(fullName, 5, 5),
    // Timestamps
    created_at: foster.created_at || null,
    updated_at: foster.updated_at || null,
  };
}

function buildVolunteerSearchDoc(volunteer) {
  if (!volunteer) return null;
  const name = volunteer.name || volunteer.full_name || '';
  const skills = Array.isArray(volunteer.skills) ? volunteer.skills.map(String) : [];

  return {
    id: volunteer.id || null,
    shelter_club_id: volunteer.shelter_club_id || null,
    volunteer_uid: volunteer.volunteer_uid || null,
    // Display
    name,
    name_lower: normalizeText(name),
    email_domain: volunteer.email
      ? volunteer.email.split('@')[1] || null
      : null, // LGPD: não expõe email completo
    // Skills (LGPD-safe: apenas habilidades, sem PII)
    skills,
    skills_tokens: skills.flatMap((s) => tokenize(s)),
    has_vehicle: volunteer.has_vehicle || false,
    status: volunteer.status || null,
    // Prefix
    name_prefix_3: buildPrefixes(name, 3, 3),
    name_prefix_4: buildPrefixes(name, 4, 4),
    name_prefix_5: buildPrefixes(name, 5, 5),
    // Timestamps
    created_at: volunteer.created_at || null,
    updated_at: volunteer.updated_at || null,
  };
}

// ─── Builders — Adoption Interests (adopter entity) ───────────────────────

/**
 * Constrói documento de índice para `adoption_interests`.
 * Compatível com search domain (adopter entity):
 *   searchableFields: applicant_name, applicant_email, applicant_phone, notes
 *   filterableFields: shelter_club_id, status, pet_id
 *
 * O campo `search_keywords` é um array de tokens normalizados que alimenta
 * queries `array-contains` no Firestore nativo.
 */
function buildAdoptionInterestSearchDoc(interest) {
  if (!interest) return null;
  const name = interest.applicant_name || interest.user_name || '';
  const email = interest.applicant_email || '';
  const phone = interest.applicant_phone || '';
  const notes = interest.notes || '';

  // Tokens: nome + email (username, não domínio) + notes
  const nameTokens = tokenize(name);
  const emailTokens = email.split('@')[0] ? tokenize(email.split('@')[0]) : [];
  const notesTokens = tokenize(notes);
  const allTokens = [...nameTokens, ...emailTokens, ...notesTokens].filter(Boolean);

  return {
    // IDs e tenancy
    id: interest.id || null,
    shelter_club_id: interest.shelter_club_id || null,
    pet_id: interest.pet_id || null,
    user_id: interest.user_id || null,
    // Display (LGPD-safe: email completo não vai para search)
    applicant_name: name,
    applicant_name_lower: normalizeText(name),
    applicant_email_domain: email.includes('@') ? email.split('@')[1] : null,
    status: interest.status || null,
    notes: notes.substring(0, 500), // trunca para não inflar doc
    // Search keywords (array para array-contains queries)
    search_keywords: allTokens,
    // Prefixes do nome para starts-with queries
    name_prefix_3: buildPrefixes(name, 3, 3),
    name_prefix_4: buildPrefixes(name, 4, 4),
    name_prefix_5: buildPrefixes(name, 5, 5),
    // Timestamps
    created_at: interest.created_at || null,
    updated_at: interest.updated_at || null,
  };
}

// ─── Builders — Exhibitions ──────────────────────────────────────────────

/**
 * Constrói documento de índice para `exhibitions`.
 * A collection é `clubs/{clubId}/exhibitions/{exhibitionId}`
 * (collectionGroup query + filtro shelter_club_id).
 */
function buildExhibitionSearchDoc(exhibition) {
  if (!exhibition) return null;
  const title = exhibition.title || '';
  const description = exhibition.description || '';
  const location = exhibition.location || '';
  const city = exhibition.city || '';
  const organizer = exhibition.organizer_name || '';

  return {
    // IDs e tenancy
    id: exhibition.id || null,
    shelter_club_id: exhibition.shelter_club_id || null,
    organizer_uid: exhibition.organizer_uid || null,
    // Display
    title,
    title_lower: normalizeText(title),
    description: description.substring(0, 500),
    location,
    location_lower: normalizeText(location),
    city,
    organizer_name: organizer,
    status: exhibition.status || null,
    start_date: exhibition.start_date || exhibition.datetime_start || null,
    // Tokens
    title_tokens: tokenize(title),
    description_tokens: tokenize(description),
    city_tokens: tokenize(city),
    organizer_tokens: tokenize(organizer),
    // Search keywords
    search_keywords: [
      ...tokenize(title),
      ...tokenize(description),
      ...tokenize(location),
      ...tokenize(city),
    ],
    // Prefixes
    title_prefix_3: buildPrefixes(title, 3, 3),
    title_prefix_4: buildPrefixes(title, 4, 4),
    title_prefix_5: buildPrefixes(title, 5, 5),
    // Timestamps
    created_at: exhibition.created_at || null,
    updated_at: exhibition.updated_at || null,
  };
}

// ─── Builders — Timeline (pet_timeline) ───────────────────────────────────

/**
 * Constrói documento de índice para `timeline`.
 * A collection é `clubs/{clubId}/pet_timeline/{eventId}`
 * (collectionGroup query + filtro shelter_club_id).
 *
 * Importante: cada entrada na timeline tem apenas `type` e `description`
 * como searchableFields. Não indexamos `data` (informação estruturada,
 * não texto livre).
 */
function buildTimelineSearchDoc(event) {
  if (!event) return null;
  const type = event.type || '';
  const description = event.description || '';
  const recordedBy = event.recorded_by_name || '';

  return {
    // IDs e tenancy
    id: event.id || null,
    shelter_club_id: event.shelter_club_id || null,
    pet_id: event.pet_id || null,
    recorded_by_uid: event.recorded_by_uid || null,
    // Display
    type,
    description: description.substring(0, 500),
    recorded_by_name: recordedBy,
    event_date: event.event_date || null,
    // Tokens
    type_tokens: tokenize(type),
    description_tokens: tokenize(description),
    recorded_tokens: tokenize(recordedBy),
    // Search keywords
    search_keywords: [
      ...tokenize(type),
      ...tokenize(description),
    ],
    // Timestamps
    created_at: event.created_at || null,
  };
}

// ─── Cloud Functions ────────────────────────────────────────────────────

exports.onPetWrite = onDocumentWritten(
  { document: 'pets/{petId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const petId = event.params.petId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        // Pet deletado — remove do índice
        await db.doc(`search_pets/${petId}`).delete().catch(() => {});
        logger.info(`search_pets/${petId} deleted`);
      } else {
        const searchDoc = buildPetSearchDoc({ id: petId, ...after });
        if (searchDoc) {
          await db.doc(`search_pets/${petId}`).set(searchDoc, { merge: true });
          logger.info(`search_pets/${petId} synced`);
        }
      }
    } catch (err) {
      logger.error('onPetWrite error:', err);
    }
  },
);

exports.onClubWrite = onDocumentWritten(
  { document: 'clubs/{clubId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const clubId = event.params.clubId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_clubs/${clubId}`).delete().catch(() => {});
        logger.info(`search_clubs/${clubId} deleted`);
      } else {
        const searchDoc = buildClubSearchDoc({ id: clubId, ...after });
        if (searchDoc) {
          await db.doc(`search_clubs/${clubId}`).set(searchDoc, { merge: true });
          logger.info(`search_clubs/${clubId} synced`);
        }
      }
    } catch (err) {
      logger.error('onClubWrite error:', err);
    }
  },
);

exports.onFosterWrite = onDocumentWritten(
  { document: 'fosters/{fosterId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const fosterId = event.params.fosterId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_fosters/${fosterId}`).delete().catch(() => {});
        logger.info(`search_fosters/${fosterId} deleted`);
      } else {
        const searchDoc = buildFosterSearchDoc({ id: fosterId, ...after });
        if (searchDoc) {
          await db.doc(`search_fosters/${fosterId}`).set(searchDoc, { merge: true });
          logger.info(`search_fosters/${fosterId} synced`);
        }
      }
    } catch (err) {
      logger.error('onFosterWrite error:', err);
    }
  },
);

exports.onVolunteerWrite = onDocumentWritten(
  { document: 'volunteers/{volunteerId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const volunteerId = event.params.volunteerId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_volunteers/${volunteerId}`).delete().catch(() => {});
        logger.info(`search_volunteers/${volunteerId} deleted`);
      } else {
        const searchDoc = buildVolunteerSearchDoc({ id: volunteerId, ...after });
        if (searchDoc) {
          await db.doc(`search_volunteers/${volunteerId}`).set(searchDoc, { merge: true });
          logger.info(`search_volunteers/${volunteerId} synced`);
        }
      }
    } catch (err) {
      logger.error('onVolunteerWrite error:', err);
    }
  },
);

// ─── TASK-048.1: 3 entities restantes ───────────────────────────────────

/**
 * onAdoptionInterestWrite — TASK-048.1
 *
 * Mantém `search_adoption_interests/{interestId}` em sync com
 * `adoption_interests/{interestId}`.
 *
 * O documento de índice contém `search_keywords` (tokens normalizados do
 * nome/email do adotante) que habilita queries array-contains.
 */
exports.onAdoptionInterestWrite = onDocumentWritten(
  { document: 'adoption_interests/{interestId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const interestId = event.params.interestId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_adoption_interests/${interestId}`).delete().catch(() => {});
        logger.info(`search_adoption_interests/${interestId} deleted`);
      } else {
        const searchDoc = buildAdoptionInterestSearchDoc({ id: interestId, ...after });
        if (searchDoc) {
          await db.doc(`search_adoption_interests/${interestId}`).set(searchDoc, { merge: true });
          logger.info(`search_adoption_interests/${interestId} synced`);
        }
      }
    } catch (err) {
      logger.error('onAdoptionInterestWrite error:', err);
    }
  },
);

/**
 * onExhibitionWrite — TASK-048.1
 *
 * Mantém `search_exhibitions/{exhibitionId}` em sync com
 * `clubs/{clubId}/exhibitions/{exhibitionId}`.
 *
 * Usa collectionGroup trigger: a path inclui shelter_club_id
 * no documento para ACL (defesa em profundidade).
 */
exports.onExhibitionWrite = onDocumentWritten(
  { document: 'clubs/{clubId}/exhibitions/{exhibitionId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const exhibitionId = event.params.exhibitionId;
    const clubId = event.params.clubId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_exhibitions/${exhibitionId}`).delete().catch(() => {});
        logger.info(`search_exhibitions/${exhibitionId} deleted`);
      } else {
        // Injeta shelter_club_id via parent clubId
        const searchDoc = buildExhibitionSearchDoc({
          id: exhibitionId,
          shelter_club_id: clubId,
          ...after,
        });
        if (searchDoc) {
          await db.doc(`search_exhibitions/${exhibitionId}`).set(searchDoc, { merge: true });
          logger.info(`search_exhibitions/${exhibitionId} synced (club=${clubId})`);
        }
      }
    } catch (err) {
      logger.error('onExhibitionWrite error:', err);
    }
  },
);

/**
 * onTimelineWrite — TASK-048.1
 *
 * Mantém `search_timeline/{eventId}` em sync com
 * `clubs/{clubId}/pet_timeline/{eventId}`.
 *
 * A collection é `pet_timeline` (nome canônico no projeto). Cada evento
 * referencia shelter_club_id + pet_id para tenancy e ACL.
 */
exports.onTimelineWrite = onDocumentWritten(
  { document: 'clubs/{clubId}/pet_timeline/{eventId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const eventId = event.params.eventId;
    const clubId = event.params.clubId;
    const before = event.data?.before.data() ?? null;
    const after = event.data?.after.data() ?? null;

    try {
      if (!after) {
        await db.doc(`search_timeline/${eventId}`).delete().catch(() => {});
        logger.info(`search_timeline/${eventId} deleted`);
      } else {
        const searchDoc = buildTimelineSearchDoc({
          id: eventId,
          shelter_club_id: clubId, // inject from parent
          ...after,
        });
        if (searchDoc) {
          await db.doc(`search_timeline/${eventId}`).set(searchDoc, { merge: true });
          logger.info(`search_timeline/${eventId} synced (club=${clubId})`);
        }
      }
    } catch (err) {
      logger.error('onTimelineWrite error:', err);
    }
  },
);
