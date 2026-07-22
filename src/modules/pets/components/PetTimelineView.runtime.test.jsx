/**
 * @fileoverview PetTimelineView.runtime.test.jsx — Validação runtime.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('../hooks/usePetTimeline', () => ({
  usePetTimeline: vi.fn(() => ({ data: [], isLoading: false })),
}));

import PetTimelineView from './PetTimelineView';

describe('PetTimelineView — runtime safety', () => {
  it('renders without ReferenceError', () => {
    expect(() => {
      render(<PetTimelineView petId="p1" />);
    }).not.toThrow();
  });
});
