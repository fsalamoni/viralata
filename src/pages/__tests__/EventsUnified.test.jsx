/**
 * @fileoverview Tests for EventsUnified (TASK-181).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/modules/shelter/services/exhibitionPublicService', () => ({
  listPublicExhibitions: vi.fn().mockResolvedValue([]),
  groupExhibitionsByShelter: vi.fn(),
}));
vi.mock('@/modules/communities/services/publicMuralService', () => ({
  listPublicMuralPosts: vi.fn().mockResolvedValue([]),
}));

const EventsUnified = (await import('@/pages/EventsUnified.jsx')).default;

describe('EventsUnified (TASK-181)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof EventsUnified).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <EventsUnified />
          </MemoryRouter>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
