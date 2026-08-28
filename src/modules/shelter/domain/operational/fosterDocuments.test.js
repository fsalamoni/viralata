/**
 * @fileoverview Testes: fosterDocuments (Fase 3 — SHELTER_FOSTER_V2).
 */

import { describe, it, expect } from 'vitest';
import {
  fosterDocuments,
  fosterDocumentsCount,
  FOSTER_TERM_ROUTE,
} from './fosterDocuments.js';
import { TERMS_TYPE } from '@/modules/shelter/domain/legal/terms';

describe('fosterDocuments', () => {
  it('inclui o Termo de Lar Temporário como primeiro documento', () => {
    const docs = fosterDocuments();
    expect(docs[0].type).toBe(TERMS_TYPE.FOSTER);
    expect(docs[0].path).toBe(FOSTER_TERM_ROUTE);
    expect(docs[0].version).toBeTruthy();
  });

  it('usa a rota real /lares-temporarios (não o section_path /termos-lar-temporario)', () => {
    expect(fosterDocuments()[0].path).toBe('/lares-temporarios');
  });

  it('marca o termo como aceito quando o lar tem terms_accepted_at', () => {
    const docs = fosterDocuments({
      home: { terms_accepted_at: '2026-08-01T10:00:00Z', terms_version: '2026-07-10' },
    });
    expect(docs[0].accepted).toBe(true);
    expect(docs[0].accepted_at).toBe('2026-08-01T10:00:00Z');
    expect(docs[0].accepted_version).toBe('2026-07-10');
  });

  it('marca não-aceito quando o lar não tem aceite', () => {
    const docs = fosterDocuments({ home: {} });
    expect(docs[0].accepted).toBe(false);
    expect(docs[0].accepted_at).toBeNull();
  });

  it('inclui os termos obrigatórios da plataforma (accepted=null)', () => {
    const docs = fosterDocuments();
    expect(docs.length).toBeGreaterThanOrEqual(3);
    const general = docs.slice(1);
    general.forEach((d) => {
      expect(d.accepted).toBeNull();
      expect(d.required).toBe(true);
    });
  });

  it('não duplica o termo de lar temporário se estiver nos obrigatórios', () => {
    const types = fosterDocuments().map((d) => d.type);
    const fCount = types.filter((t) => t === TERMS_TYPE.FOSTER).length;
    expect(fCount).toBe(1);
  });

  it('fosterDocumentsCount == length', () => {
    expect(fosterDocumentsCount()).toBe(fosterDocuments().length);
  });
});
