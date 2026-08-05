import { describe, it, expect } from 'vitest';
import {
  speciesRescueCode,
  formatRescueNumber,
  daysInShelter,
  shelterAnimalProfileUpdateSchema,
} from './animal';

describe('speciesRescueCode', () => {
  it('mapeia cão/cachorro/dog → C', () => {
    expect(speciesRescueCode('Cachorro')).toBe('C');
    expect(speciesRescueCode('cão')).toBe('C');
    expect(speciesRescueCode('dog')).toBe('C');
  });
  it('mapeia gato/cat → G', () => {
    expect(speciesRescueCode('Gato')).toBe('G');
    expect(speciesRescueCode('cat')).toBe('G');
  });
  it('fallback para primeira letra maiúscula, ou A se vazio', () => {
    expect(speciesRescueCode('Pássaro')).toBe('P');
    expect(speciesRescueCode('')).toBe('A');
    expect(speciesRescueCode(undefined)).toBe('A');
  });
});

describe('formatRescueNumber', () => {
  it('formata como C-00001/26', () => {
    expect(formatRescueNumber('C', 1, new Date('2026-03-01'))).toBe('C-00001/26');
    expect(formatRescueNumber('G', 42, 2026)).toBe('G-00042/26');
  });
  it('preenche seq com 5 dígitos e ano com 2', () => {
    expect(formatRescueNumber('C', 12345, 2030)).toBe('C-12345/30');
  });
});

describe('daysInShelter', () => {
  it('conta da data de resgate até agora quando ainda no abrigo', () => {
    const now = new Date('2026-01-11T00:00:00Z');
    const pet = { rescue_date: '2026-01-01T00:00:00Z', status: 'available' };
    expect(daysInShelter(pet, now)).toBe(10);
  });
  it('conta até a data do status quando adotado', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    const pet = {
      rescue_date: '2026-01-01T00:00:00Z',
      status: 'adopted',
      status_changed_at: '2026-01-06T00:00:00Z',
    };
    expect(daysInShelter(pet, now)).toBe(5);
  });
  it('retorna null sem data de referência', () => {
    expect(daysInShelter({ status: 'available' })).toBeNull();
    expect(daysInShelter(null)).toBeNull();
  });
});

describe('shelterAnimalProfileUpdateSchema — novos campos', () => {
  it('aceita os novos campos internos', () => {
    const parsed = shelterAnimalProfileUpdateSchema.parse({
      rescue_number: 'C-00001/26',
      rescue_responsible_name: 'Maria',
      birth_date: '2024-05-01',
      current_location: 'foster',
      current_location_notes: 'lar da Ana',
      legal_process_number: '1234567-89.2026',
      observations: 'dócil',
      rescue_location: { description: 'rua X', lat: -30.03, lng: -51.21 },
      rescue_photos: [{ url: 'https://x/y.jpg', visibility: 'internal' }],
    });
    expect(parsed.rescue_number).toBe('C-00001/26');
    expect(parsed.current_location).toBe('foster');
    expect(parsed.rescue_location.lat).toBeCloseTo(-30.03);
    expect(parsed.rescue_photos[0].visibility).toBe('internal');
  });
  it('rejeita current_location inválido', () => {
    expect(() => shelterAnimalProfileUpdateSchema.parse({ current_location: 'marte' })).toThrow();
  });
});
