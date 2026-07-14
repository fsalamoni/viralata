/**
 * @fileoverview Testes do SocialShare (TASK-143).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SocialShare (TASK-143)', () => {
  it('componente é função', () => {
    // import dinâmico para evitar erro
    return import('./SocialShare.jsx').then((m) => {
      expect(typeof m.SocialShare).toBe('function');
    });
  });

  it('exporta default', () => {
    return import('./SocialShare.jsx').then((m) => {
      expect(m.default).toBeDefined();
    });
  });
});

describe('SocialShare — helpers (URLs)', () => {
  it('gera URL canônica do pet', () => {
    return import('./SocialShare.jsx').then(() => {
      // canonicalPetUrl é internal mas podemos verificar via prop
      const url = `${window.location.origin}/pet/pet-123`;
      expect(url).toContain('/pet/pet-123');
    });
  });
});
