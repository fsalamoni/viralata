/**
 * legalDocsService — testes (TASK-021)
 *
 * Cobre o service + hook useLegalDoc com mocks do Firestore.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock do Firestore ANTES do import do service
const mockGetDoc = vi.fn();
const mockDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getFirestore: () => ({}),
}));

import { fetchLegalDoc, useLegalDoc, LEGAL_DOCS, LEGAL_DOC_META } from './legalDocsService';
import { renderHook, waitFor, act } from '@testing-library/react';

function mockSnap(data) {
  return {
    exists: () => data !== null,
    data: () => data || {},
  };
}

describe('legalDocsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constants', () => {
    it('exports 3 doc keys', () => {
      expect(Object.values(LEGAL_DOCS)).toEqual([
        'privacy_policy_v2',
        'terms_v2',
        'legislation_v2',
      ]);
    });

    it('cada docKey tem meta com title + fallbackPath', () => {
      for (const [k, meta] of Object.entries(LEGAL_DOC_META)) {
        expect(meta).toHaveProperty('title');
        expect(meta).toHaveProperty('fallbackPath');
        expect(typeof meta.title).toBe('string');
      }
    });
  });

  describe('fetchLegalDoc', () => {
    it('retorna null quando doc não existe', async () => {
      mockGetDoc.mockResolvedValueOnce(mockSnap(null));
      const result = await fetchLegalDoc(LEGAL_DOCS.PRIVACY_POLICY);
      expect(result).toBeNull();
    });

    it('retorna null quando active=false', async () => {
      mockGetDoc.mockResolvedValueOnce(mockSnap({ active: false, content: 'x' }));
      const result = await fetchLegalDoc(LEGAL_DOCS.PRIVACY_POLICY);
      expect(result).toBeNull();
    });

    it('parseia doc ativo e retorna campos do frontmatter', async () => {
      mockGetDoc.mockResolvedValueOnce(
        mockSnap({
          title: 'Política de Privacidade',
          version: '2026-07-10',
          author: 'Equipe Viralata',
          active: true,
          content: '# LGPD\n\nTexto...',
          effectiveAt: { toDate: () => new Date('2026-07-10T00:00:00Z') },
          publishedAt: { toDate: () => new Date('2026-07-09T00:00:00Z') },
        })
      );
      const result = await fetchLegalDoc(LEGAL_DOCS.PRIVACY_POLICY);
      expect(result.title).toBe('Política de Privacidade');
      expect(result.version).toBe('2026-07-10');
      expect(result.author).toBe('Equipe Viralata');
      expect(result.content).toBe('# LGPD\n\nTexto...');
      expect(result.effectiveAt).toBeInstanceOf(Date);
      expect(result.source).toBe('firestore');
    });

    it('lança erro se docKey inválido', async () => {
      await expect(fetchLegalDoc('not_a_doc')).rejects.toThrow('docKey inválido');
    });
  });

  describe('useLegalDoc hook', () => {
    it('inicia com loading=true, data=null', () => {
      mockGetDoc.mockReturnValue(new Promise(() => {})); // nunca resolve
      const { result } = renderHook(() => useLegalDoc(LEGAL_DOCS.TERMS));
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('carrega doc ativo do Firestore', async () => {
      mockGetDoc.mockResolvedValueOnce(
        mockSnap({
          title: 'Termos',
          version: 'v1',
          active: true,
          content: 'Lorem',
        })
      );
      const { result } = renderHook(() => useLegalDoc(LEGAL_DOCS.TERMS));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data?.title).toBe('Termos');
      expect(result.current.error).toBeNull();
    });

    it('data=null + error capturado quando Firestore falha (não-fatal)', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('offline'));
      const { result } = renderHook(() => useLegalDoc(LEGAL_DOCS.PRIVACY_POLICY));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toBeNull();
      expect(result.current.error?.message).toBe('offline');
    });
  });
});
