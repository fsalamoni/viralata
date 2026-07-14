/**
 * @fileoverview Tests for VolunteerProfile page (TASK-266).
 */
import { describe, it, expect } from 'vitest';

import VolunteerProfile from '@/pages/VolunteerProfile.jsx';

describe('VolunteerProfile page (TASK-266)', () => {
  it('default export é função', () => {
    expect(typeof VolunteerProfile).toBe('function');
  });
});
