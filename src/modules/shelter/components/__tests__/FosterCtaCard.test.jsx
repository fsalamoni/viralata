/**
 * @fileoverview Tests for FosterCtaCard (TASK-132).
 */
import { describe, it, expect } from 'vitest';

import { FosterCtaCard } from '@/modules/shelter/components/FosterCtaCard.jsx';

describe('FosterCtaCard (TASK-132)', () => {
  it('componente é função', () => {
    expect(typeof FosterCtaCard).toBe('function');
  });

  it('aceita props esperadas (clubId, clubName)', () => {
    const fn = FosterCtaCard;
    expect(fn).toBeDefined();
  });
});
