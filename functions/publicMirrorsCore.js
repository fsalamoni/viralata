/**
 * @fileoverview Public mirrors — pure builders (TASK-939 / TASK-949).
 *
 * Projeta documentos multi-tenant (clubs/{clubId}/exhibitions, clubs/{clubId}/fosters)
 * em coleções públicas lidas anonimamente (exhibitions_public,
 * foster_placements_public). ALLOWLIST estrita: nenhum campo de PII do lar
 * temporário (nome, CPF, telefone, endereço) ou interno do abrigo sai daqui.
 *
 * Testável sem firebase-admin — recebe os docs já lidos.
 */

'use strict';

const EXHIBITION_PUBLIC_STATUSES = ['scheduled', 'active', 'completed'];
const FOSTER_PUBLIC_STATUSES = ['pending', 'active'];

const DAY_MS = 24 * 60 * 60 * 1000;

function str(v, max = 2000) {
  return typeof v === 'string' && v ? v.slice(0, max) : null;
}

function shelterFields(club) {
  return {
    shelter_name: str(club?.name, 200) || 'Abrigo',
    shelter_city: str(club?.city, 120) || '',
    shelter_state: str(club?.state, 2) || '',
    shelter_logo_url: str(club?.logo_url, 1000),
  };
}

/**
 * @param {{id:string, clubId:string, exhibition:object|null, club:object|null}} p
 * @returns {object|null} doc público, ou null se não deve ser espelhado (apaga)
 */
function buildExhibitionPublicDoc({ id, clubId, exhibition, club }) {
  if (!exhibition) return null;
  if (!EXHIBITION_PUBLIC_STATUSES.includes(exhibition.status)) return null;
  const petIds = Array.isArray(exhibition.pet_ids) ? exhibition.pet_ids : [];
  const external = Array.isArray(exhibition.external_pets) ? exhibition.external_pets : [];
  return {
    id,
    shelter_club_id: clubId,
    title: str(exhibition.title, 200) || 'Vitrine',
    description: str(exhibition.description, 2000),
    location: str(exhibition.venue?.address, 300) || str(exhibition.location, 300),
    datetime_start: str(exhibition.datetime_start, 40),
    datetime_end: str(exhibition.datetime_end, 40),
    status: exhibition.status,
    cover_url: str(exhibition.cover_url, 1000),
    internal_pets_count: petIds.length,
    external_pets_count: external.length,
    requires_volunteers: exhibition.requires_volunteers === true,
    ...shelterFields(club),
    mirrored_at: new Date().toISOString(),
  };
}

/**
 * @param {{id:string, clubId:string, placement:object|null, pet:object|null, club:object|null}} p
 * @returns {object|null}
 */
function buildFosterPublicDoc({ id, clubId, placement, pet, club }) {
  if (!placement) return null;
  if (!FOSTER_PUBLIC_STATUSES.includes(placement.status)) return null;
  const start = Date.parse(placement.start_date || '');
  const end = Date.parse(placement.end_date || '');
  const durationDays = Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.round((end - start) / DAY_MS)
    : null;
  const photos = Array.isArray(pet?.photos) ? pet.photos.filter(Boolean) : [];
  return {
    id,
    shelter_club_id: clubId,
    pet_id: str(placement.pet_id, 128),
    pet_name: str(pet?.name, 120) || str(pet?.title, 120) || 'Pet',
    pet_species: str(pet?.species, 20),
    pet_size: str(pet?.size, 20),
    pet_age: str(pet?.age_group, 20),
    pet_photo_url: str(photos[0], 1000),
    status: placement.status,
    duration_days: durationDays,
    start_date: str(placement.start_date, 40),
    end_date: str(placement.end_date, 40),
    accepted_at: str(placement.accepted_at, 40),
    required_skills: [],
    ...shelterFields(club),
    created_at: placement.created_at ?? null,
    mirrored_at: new Date().toISOString(),
  };
}

module.exports = {
  EXHIBITION_PUBLIC_STATUSES,
  FOSTER_PUBLIC_STATUSES,
  buildExhibitionPublicDoc,
  buildFosterPublicDoc,
};
