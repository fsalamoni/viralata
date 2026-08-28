/**
 * @fileoverview Testes: volunteerDocuments (Fase 2 — SHELTER_VOLUNTEERS_V2).
 */

import { describe, it, expect } from 'vitest';
import {
  volunteerDocuments,
  volunteerDocumentsCount,
  VOLUNTEER_TERM_ROUTE,
} from './volunteerDocuments.js';
import { TERMS_TYPE } from '@/modules/shelter/domain/legal/terms';

describe('volunteerDocuments', () => {
  it('inclui o Termo de Voluntariado como primeiro documento', () => {
    const docs = volunteerDocuments();
    expect(docs[0].type).toBe(TERMS_TYPE.VOLUNTEER);
    expect(docs[0].path).toBe(VOLUNTEER_TERM_ROUTE);
    expect(docs[0].version).toBeTruthy();
  });

  it('usa a rota real /voluntarios/termo (não o section_path /termos-voluntario)', () => {
    expect(volunteerDocuments()[0].path).toBe('/voluntarios/termo');
  });

  it('marca o termo como aceito quando a rostagem tem terms_accepted_at', () => {
    const docs = volunteerDocuments({
      rosterEntry: { terms_accepted_at: '2026-08-01T10:00:00Z', terms_version: '2026-07-10-v2' },
    });
    expect(docs[0].accepted).toBe(true);
    expect(docs[0].accepted_at).toBe('2026-08-01T10:00:00Z');
    expect(docs[0].accepted_version).toBe('2026-07-10-v2');
  });

  it('marca não-aceito quando a rostagem não tem aceite', () => {
    const docs = volunteerDocuments({ rosterEntry: {} });
    expect(docs[0].accepted).toBe(false);
    expect(docs[0].accepted_at).toBeNull();
  });

  it('inclui os termos obrigatórios da plataforma (accepted=null)', () => {
    const docs = volunteerDocuments();
    // ao menos Uso + Privacidade além do termo de voluntariado
    expect(docs.length).toBeGreaterThanOrEqual(3);
    const general = docs.slice(1);
    general.forEach((d) => {
      expect(d.accepted).toBeNull();
      expect(d.required).toBe(true);
    });
  });

  it('não duplica o termo de voluntariado se estiver nos obrigatórios', () => {
    const types = volunteerDocuments().map((d) => d.type);
    const vCount = types.filter((t) => t === TERMS_TYPE.VOLUNTEER).length;
    expect(vCount).toBe(1);
  });

  it('volunteerDocumentsCount == length', () => {
    expect(volunteerDocumentsCount()).toBe(volunteerDocuments().length);
  });
});
