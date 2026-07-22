/**
 * @fileoverview PetsOpsTable.runtime.test.jsx — Validação runtime.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'u1' } })),
}));

import PetsOpsTable from './PetsOpsTable';

describe('PetsOpsTable — runtime safety', () => {
  it('renders without ReferenceError', () => {
    expect(() => {
      render(
        <MemoryRouter>
          <PetsOpsTable clubId="c1" canManage={true} />
        </MemoryRouter>
      );
    }).not.toThrow();
  });
});
