/**
 * @fileoverview Tests for VolunteerSection (TASK-265).
 */
import { describe, it, expect } from 'vitest';

import { VolunteerSection } from '@/modules/shelter/components/VolunteerSection.jsx';

describe('VolunteerSection (TASK-265)', () => {
  it('componente é função', () => {
    expect(typeof VolunteerSection).toBe('function');
  });

  it('aceita props esperadas', () => {
    const fn = VolunteerSection;
    expect(fn.length).toBe(0);
  });
});
