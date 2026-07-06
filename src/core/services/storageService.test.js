import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { downloadImage } from './storageService';
import { logger } from '@/core/lib/logger';

vi.mock('@/core/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('storageService', () => {
  describe('downloadImage', () => {
    let originalFetch;
    let originalWindowOpen;

    beforeEach(() => {
      originalFetch = global.fetch;
      originalWindowOpen = window.open;
      global.fetch = vi.fn();
      window.open = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      window.open = originalWindowOpen;
      vi.clearAllMocks();
    });

    it('abre a imagem em nova aba caso o fetch falhe (fallback)', async () => {
      const testUrl = 'https://example.com/test-image.jpg';
      global.fetch.mockRejectedValue(new Error('Network error'));

      await downloadImage(testUrl);

      expect(logger.error).toHaveBeenCalledWith('Download direto falhou, abrindo em nova aba:', expect.any(Error));
      expect(window.open).toHaveBeenCalledWith(testUrl, '_blank', 'noopener,noreferrer');
    });

    it('abre a imagem em nova aba caso o fetch não retorne ok (fallback)', async () => {
      const testUrl = 'https://example.com/test-image.jpg';
      global.fetch.mockResolvedValue({ ok: false });

      await downloadImage(testUrl);

      expect(logger.error).toHaveBeenCalledWith('Download direto falhou, abrindo em nova aba:', expect.any(Error));
      expect(window.open).toHaveBeenCalledWith(testUrl, '_blank', 'noopener,noreferrer');
    });
  });
});
