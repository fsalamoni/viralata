import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculatePriorityScore, getPriorityLabel } from './priority';

describe('priority domain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculatePriorityScore', () => {
    const NOW_SECONDS = new Date('2024-01-01T00:00:00Z').getTime() / 1000;

    it('should return 0 if pet or created_at is missing', () => {
      expect(calculatePriorityScore(null)).toBe(0);
      expect(calculatePriorityScore(undefined)).toBe(0);
      expect(calculatePriorityScore({})).toBe(0);
      expect(calculatePriorityScore({ created_at: null })).toBe(0);
      expect(calculatePriorityScore({ created_at: {} })).toBe(0);
    });

    it('should return 0 if age is less than 90 days', () => {
      const createdAtSeconds = NOW_SECONDS - (89 * 86400); // 89 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(0);
    });

    it('should return 1 if age is 90 days', () => {
      const createdAtSeconds = NOW_SECONDS - (90 * 86400); // 90 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(1);
    });

    it('should return 1 if age is between 90 and 179 days', () => {
      const createdAtSeconds = NOW_SECONDS - (100 * 86400); // 100 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(1);
    });

    it('should return 2 if age is 180 days', () => {
      const createdAtSeconds = NOW_SECONDS - (180 * 86400); // 180 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(2);
    });

    it('should return 2 if age is between 180 and 364 days', () => {
      const createdAtSeconds = NOW_SECONDS - (200 * 86400); // 200 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(2);
    });

    it('should return 3 if age is 365 days', () => {
      const createdAtSeconds = NOW_SECONDS - (365 * 86400); // 365 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(3);
    });

    it('should return 3 if age is more than 365 days', () => {
      const createdAtSeconds = NOW_SECONDS - (400 * 86400); // 400 days ago
      expect(calculatePriorityScore({ created_at: { seconds: createdAtSeconds } })).toBe(3);
    });
  });

  describe('getPriorityLabel', () => {
    it('should return correct labels based on score', () => {
      expect(getPriorityLabel(0)).toBe('');
      expect(getPriorityLabel(1)).toBe('Esperando há 3 meses');
      expect(getPriorityLabel(2)).toBe('Super Like — 6 meses');
      expect(getPriorityLabel(3)).toBe('Urgente — 1 ano');
    });

    it('should return empty string for unknown scores', () => {
      expect(getPriorityLabel(4)).toBe('');
      expect(getPriorityLabel(-1)).toBe('');
    });
  });
});
