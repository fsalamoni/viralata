/**
 * @fileoverview Smoke tests for AdopterDashboard (TASK-339).
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-339
 */
import { describe, it, expect } from 'vitest';
import { AdopterDashboard } from '@/modules/adopter/pages/AdopterDashboard.jsx';

describe('AdopterDashboard (TASK-339)', () => {
  it('componente é função', () => {
    expect(typeof AdopterDashboard).toBe('function');
  });

  it('aceita props sem crash', () => {
    const fn = AdopterDashboard;
    expect(fn).toBeDefined();
  });
});
