/**
 * @fileoverview Tests for JoinVolunteerModal (TASK-264).
 */
import { describe, it, expect } from 'vitest';

import { JoinVolunteerModal } from '@/modules/shelter/components/JoinVolunteerModal.jsx';

describe('JoinVolunteerModal (TASK-264)', () => {
  it('componente é função', () => {
    expect(typeof JoinVolunteerModal).toBe('function');
  });

  it('aceita props esperadas', () => {
    // Validação estática: props esperadas
    const fn = JoinVolunteerModal;
    expect(fn.length).toBeGreaterThanOrEqual(1); // props
  });
});
