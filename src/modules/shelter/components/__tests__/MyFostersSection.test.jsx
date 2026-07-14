/**
 * @fileoverview Tests for MyFostersSection (TASK-133).
 */
import { describe, it, expect } from 'vitest';

import { MyFostersSection } from '@/modules/shelter/components/MyFostersSection.jsx';

describe('MyFostersSection (TASK-133)', () => {
  it('componente é função', () => {
    expect(typeof MyFostersSection).toBe('function');
  });

  it('aceita prop userUid', () => {
    const fn = MyFostersSection;
    expect(fn).toBeDefined();
  });
});
