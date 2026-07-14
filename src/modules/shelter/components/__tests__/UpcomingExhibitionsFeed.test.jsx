/**
 * @fileoverview Tests for UpcomingExhibitionsFeed (TASK-149).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/modules/shelter/services/exhibitionPublicService', () => ({
  listPublicExhibitions: vi.fn().mockResolvedValue([]),
  groupExhibitionsByShelter: vi.fn(),
}));

const { UpcomingExhibitionsFeed } = await import('@/modules/shelter/components/UpcomingExhibitionsFeed.jsx');

describe('UpcomingExhibitionsFeed (TASK-149)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof UpcomingExhibitionsFeed).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <UpcomingExhibitionsFeed limit={6} />
          </MemoryRouter>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
