import { describe, it, expect } from 'vitest';
import { buildExhibitionPublicDoc, buildFosterPublicDoc } from './publicMirrorsCore.js';

const club = { name: 'Abrigo Feliz', city: 'Campinas', state: 'SP', logo_url: 'https://x/logo.png', cnpj: '00' };

describe('publicMirrorsCore — exhibitions_public', () => {
  it('espelha vitrine agendada com campos públicos + abrigo', () => {
    const doc = buildExhibitionPublicDoc({
      id: 'ex1',
      clubId: 'c1',
      club,
      exhibition: {
        title: 'Feira de adoção',
        status: 'scheduled',
        venue: { address: 'Praça X, 10', lat: -22, lng: -47 },
        datetime_start: '2026-11-01T12:00:00.000Z',
        datetime_end: '2026-11-01T16:00:00.000Z',
        pet_ids: ['p1', 'p2'],
        external_pets: [{ pet_id: 'e1' }],
        organizer_uid: 'u-secret',
        notes: 'interno',
      },
    });
    expect(doc).toMatchObject({
      id: 'ex1',
      shelter_club_id: 'c1',
      title: 'Feira de adoção',
      location: 'Praça X, 10',
      status: 'scheduled',
      internal_pets_count: 2,
      external_pets_count: 1,
      shelter_name: 'Abrigo Feliz',
      shelter_city: 'Campinas',
      shelter_state: 'SP',
    });
    expect(doc).not.toHaveProperty('organizer_uid');
    expect(doc).not.toHaveProperty('notes');
    expect(doc).not.toHaveProperty('cnpj');
  });

  it('vitrine cancelada ou apagada → null (remove do espelho)', () => {
    expect(buildExhibitionPublicDoc({ id: 'a', clubId: 'c', club, exhibition: { status: 'cancelled' } })).toBeNull();
    expect(buildExhibitionPublicDoc({ id: 'a', clubId: 'c', club, exhibition: null })).toBeNull();
  });
});

describe('publicMirrorsCore — foster_placements_public', () => {
  const placement = {
    pet_id: 'p1',
    foster_uid: 'u-secret',
    full_name: 'Maria PII',
    cpf: '123.456.789-00',
    phone: '11999',
    status: 'pending',
    start_date: '2026-11-01T00:00:00.000Z',
    end_date: '2026-11-15T00:00:00.000Z',
  };
  const pet = { name: 'Rex', species: 'dog', size: 'medium', age_group: 'adult', photos: ['https://x/rex.jpg'] };

  it('espelha placement pendente sem PII do lar', () => {
    const doc = buildFosterPublicDoc({ id: 'f1', clubId: 'c1', placement, pet, club });
    expect(doc).toMatchObject({
      id: 'f1',
      pet_name: 'Rex',
      pet_species: 'dog',
      pet_photo_url: 'https://x/rex.jpg',
      duration_days: 14,
      status: 'pending',
      shelter_name: 'Abrigo Feliz',
      accepted_at: null,
    });
    for (const k of ['foster_uid', 'full_name', 'cpf', 'phone', 'address', 'email']) {
      expect(doc).not.toHaveProperty(k);
    }
  });

  it('placement encerrado → null', () => {
    expect(buildFosterPublicDoc({ id: 'f', clubId: 'c', placement: { ...placement, status: 'ended' }, pet, club })).toBeNull();
  });
});
