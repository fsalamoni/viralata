/**
 * @fileoverview Testes do Termo de Voluntariado v2 (Fase 19 / Bloco 1).
 *
 * Cobre:
 *  - Existência e formato do texto
 *  - Conteúdo mínimo esperado (LGPD, Lei 14.063/2020, Lei 9.605/1998)
 *  - Helpers (isCurrentVersion, getLabel)
 *  - Migration-safe: prior versions
 */

import { describe, it, expect } from 'vitest';
import {
  VOLUNTEER_TERMS_VERSION,
  VOLUNTEER_TERMS_TEXT,
  VOLUNTEER_TERMS_PRIOR_VERSIONS,
  VOLUNTEER_TERMS_SHORT_LABEL,
  getVolunteerTermsLabel,
  isCurrentVolunteerTermsVersion,
} from '@/modules/shelter/domain/legal/volunteerTerms';

describe('volunteerTerms v2 — versioning', () => {
  it('versão atual é 2026-07-10-v2', () => {
    expect(VOLUNTEER_TERMS_VERSION).toBe('2026-07-10-v2');
  });

  it('a v1 (2026-07-10) está listada como prior version', () => {
    expect(VOLUNTEER_TERMS_PRIOR_VERSIONS).toContain('2026-07-10');
  });

  it('isCurrentVolunteerTermsVersion aceita a versão atual', () => {
    expect(isCurrentVolunteerTermsVersion(VOLUNTEER_TERMS_VERSION)).toBe(true);
  });

  it('isCurrentVolunteerTermsVersion rejeita a v1', () => {
    expect(isCurrentVolunteerTermsVersion('2026-07-10')).toBe(false);
  });

  it('isCurrentVolunteerTermsVersion rejeita null/undefined', () => {
    expect(isCurrentVolunteerTermsVersion(null)).toBe(false);
    expect(isCurrentVolunteerTermsVersion(undefined)).toBe(false);
    expect(isCurrentVolunteerTermsVersion('')).toBe(false);
  });

  it('getVolunteerTermsLabel inclui versão', () => {
    expect(getVolunteerTermsLabel()).toBe(
      `${VOLUNTEER_TERMS_SHORT_LABEL} (versão ${VOLUNTEER_TERMS_VERSION})`,
    );
  });
});

describe('volunteerTerms v2 — texto integral', () => {
  it('texto existe e tem mais de 5.000 caracteres (texto integral)', () => {
    expect(typeof VOLUNTEER_TERMS_TEXT).toBe('string');
    expect(VOLUNTEER_TERMS_TEXT.length).toBeGreaterThan(5000);
  });

  it('texto contém as cláusulas obrigatórias (LGPD)', () => {
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/Lei 13\.709\/2018|LGPD/);
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/13\.709/);
    // Pelo menos uma referência a um artigo da LGPD (art. 5º, 7º, 18 etc.)
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/art\.\s*\d/);
  });

  it('texto contém referência à Lei 14.063/2020 (assinatura eletrônica)', () => {
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/14\.063\/2020/);
  });

  it('texto é vinculado a voluntariado (não adoção ou doação)', () => {
    expect(VOLUNTEER_TERMS_TEXT.toUpperCase()).toMatch(/VOLUNT[AÁ]RI/);
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/Lei 9\.608\/1998/); // Lei do Voluntariado
  });

  it('texto contém declaração de aceite com hash + carimbo UTC', () => {
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/DECLARAÇÃO/);
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/sig_/); // hash prefix
  });

  it('texto menciona Marco Civil da Internet', () => {
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/Marco Civil|12\.965\/2014/);
  });

  it('texto declara explicitamente que NÃO há vínculo empregatício', () => {
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/v[íi]ncula[çc][ãa]o empregat[íi]cia/i);
    expect(VOLUNTEER_TERMS_TEXT).toMatch(/9\.608\/1998/);
  });
});
