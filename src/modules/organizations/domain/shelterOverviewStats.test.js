import { describe, it, expect } from 'vitest';
import { computeShelterStats } from './shelterOverviewStats.js';

const NOW = new Date('2026-08-07T00:00:00Z').getTime();
const daysAgo = (n) => NOW - n * 24 * 60 * 60 * 1000;

describe('organizations/shelterOverviewStats', () => {
  it('lista vazia → zeros e nulos coerentes', () => {
    const s = computeShelterStats([], NOW);
    expect(s.total).toBe(0);
    expect(s.byStatus).toEqual({ available: 0, in_process: 0, adopted: 0, unavailable: 0 });
    expect(s.neuteredPct).toBe(0);
    expect(s.avgStayDays).toBeNull();
    expect(s.longest).toBeNull();
  });

  it('conta por status, espécie e localização', () => {
    const pets = [
      { id: 'a', status: 'available', species: 'dog', current_location: 'shelter' },
      { id: 'b', status: 'available', species: 'cat', current_location: 'foster' },
      { id: 'c', status: 'adopted', species: 'dog' },
      { id: 'd', status: 'in_process', species: 'dog', current_location: 'shelter' },
      { id: 'e', status: 'unavailable', species: 'bird' },
    ];
    const s = computeShelterStats(pets, NOW);
    expect(s.total).toBe(5);
    expect(s.available).toBe(2);
    expect(s.inProcess).toBe(1);
    expect(s.adopted).toBe(1);
    expect(s.unavailable).toBe(1);
    expect(s.bySpecies).toMatchObject({ dog: 3, cat: 1, bird: 1 });
    expect(s.byLocation).toMatchObject({ shelter: 2, foster: 1, unknown: 2 });
  });

  it('castração: contagem e porcentagem', () => {
    const pets = [
      { status: 'available', neutered: true },
      { status: 'available', neutered: true },
      { status: 'available', neutered: false },
      { status: 'available' },
    ];
    const s = computeShelterStats(pets, NOW);
    expect(s.neutered).toBe(2);
    expect(s.neuteredPct).toBe(50);
  });

  it('novos nos últimos 30 dias usa created_at (Timestamp e ISO)', () => {
    const pets = [
      { created_at: { seconds: Math.floor(daysAgo(5) / 1000) } }, // dentro
      { created_at: new Date(daysAgo(10)).toISOString() },        // dentro
      { created_at: new Date(daysAgo(40)).toISOString() },        // fora
      { /* sem created_at */ },
    ];
    const s = computeShelterStats(pets, NOW);
    expect(s.newLast30).toBe(2);
  });

  it('permanência média e maior permanência via rescue_date', () => {
    const pets = [
      { id: 'x', name: 'Rex', status: 'available', rescue_date: new Date(daysAgo(10)).toISOString() },
      { id: 'y', name: 'Luna', status: 'available', rescue_date: new Date(daysAgo(30)).toISOString() },
    ];
    const s = computeShelterStats(pets, NOW);
    expect(s.avgStayDays).toBe(20);
    expect(s.longest).toMatchObject({ id: 'y', name: 'Luna' });
    expect(s.longest.days).toBeGreaterThanOrEqual(29);
  });
});
