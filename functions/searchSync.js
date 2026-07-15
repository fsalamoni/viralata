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
const { logger } = require('firebase-functions');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

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
