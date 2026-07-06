import { describe, it, expect } from 'vitest';
import { getPriorityLabel } from './priority';

describe('getPriorityLabel', () => {
  it('should return empty string when score is 0', () => {
    expect(getPriorityLabel(0)).toBe('');
  });

  it('should return "Esperando há 3 meses" when score is 1', () => {
    expect(getPriorityLabel(1)).toBe('Esperando há 3 meses');
  });

  it('should return "Super Like — 6 meses" when score is 2', () => {
    expect(getPriorityLabel(2)).toBe('Super Like — 6 meses');
  });

  it('should return "Urgente — 1 ano" when score is 3', () => {
    expect(getPriorityLabel(3)).toBe('Urgente — 1 ano');
  });

  it('should return empty string for invalid scores', () => {
    expect(getPriorityLabel(4)).toBe('');
    expect(getPriorityLabel(-1)).toBe('');
    expect(getPriorityLabel(undefined)).toBe('');
    expect(getPriorityLabel(null)).toBe('');
  });
});
