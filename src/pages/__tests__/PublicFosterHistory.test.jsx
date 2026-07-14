/**
 * @fileoverview Smoke tests para PublicFosterHistory (TASK-326).
 * @see TASK-326
 */

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicFosterHistory from '../PublicFosterHistory';

vi.mock('@/modules/shelter/services/fosterHistoryPublicService', () => ({
  getFosterPublicHistory: vi.fn(() =>
    Promise.resolve({ denied: true }),
  ),
}));

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: vi.fn(() => true),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/lares-temporarios/uid-test/historico']}>
      <Routes>
        <Route path="/lares-temporarios/:uid/historico" element={<PublicFosterHistory />} />
        <Route path="/lares-temporarios" element={<span>Listing page</span>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicFosterHistory', () => {
  afterEach(() => vi.restoreAllMocks());

  it('smoke: component renders without crashing', () => {
    const { container } = renderPage();
    expect(container).toBeTruthy();
  });
});
