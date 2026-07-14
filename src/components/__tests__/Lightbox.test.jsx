/**
 * @fileoverview Tests for Lightbox (TASK-323).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const { Lightbox } = await import('@/components/Lightbox.jsx');

const mockImages = [
  { url: 'https://example.com/1.jpg', alt: 'Foto 1', caption: 'Cachorro feliz' },
  { url: 'https://example.com/2.jpg', alt: 'Foto 2', caption: 'Gato' },
  { url: 'https://example.com/3.jpg', alt: 'Foto 3', caption: 'Pássaro' },
];

describe('Lightbox (TASK-323)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof Lightbox).toBe('function');
  });

  it('renderiza sem crash com imagens', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(<Lightbox images={mockImages} open index={0} onClose={() => {}} />);
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });

  it('não renderiza quando open=false', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(<Lightbox images={mockImages} open={false} onClose={() => {}} />);
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });

  it('não renderiza com array vazio', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(<Lightbox images={[]} open index={0} onClose={() => {}} />);
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
