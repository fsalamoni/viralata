/**
 * @fileoverview PetLog.runtime.test.jsx — Validação que PetLog renderiza
 * sem ReferenceError.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../hooks/usePetLog', () => ({
  usePetLog: vi.fn(() => ({ data: [], isLoading: false })),
}));

import PetLog from './PetLog';

describe('PetLog — runtime safety', () => {
  it('renders without ReferenceError', () => {
    expect(() => {
      render(<PetLog petId="p1" />);
    }).not.toThrow();
  });
});
