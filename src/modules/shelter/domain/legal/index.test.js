/**
 * @fileoverview Testes do módulo `legal/index.js` (Fase 19).
 *
 * Cobre o re-export de todos os termos, a estrutura LEGAL_PAGES,
 * e o helper getLegalPageBySlug.
 */

import { describe, it, expect } from 'vitest';
import {
  // version + texts
  VOLUNTEER_TERMS_VERSION,
  VOLUNTEER_TERMS_TEXT,
  ADOPTION_TERMS_VERSION,
  ADOPTION_TERMS_TEXT,
  SHELTER_ONBOARDING_TERMS_VERSION,
  SHELTER_ONBOARDING_TERMS_TEXT,
  CONSENT_VERSION,
  COOKIE_POLICY_TEXT,
  TERMS_OF_USE_VERSION,
  TERMS_OF_USE_TEXT,
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_TEXT,
  LEGAL_NOTICES_VERSION,
  LEGAL_NOTICES_TEXT,
  CODE_OF_CONDUCT_VERSION,
  CODE_OF_CONDUCT_TEXT,
  ANIMAL_LEGISLATION_VERSION,
  ANIMAL_LEGISLATION_TEXT,
  DONATION_TERMS_VERSION,
  FOSTER_TERMS_VERSION,
  // pages
  LEGAL_PAGES,
  getLegalPageBySlug,
  // helpers
  buildConsentRecord,
  buildAdoptionTermsAcceptance,
  buildShelterOnboardingAcceptance,
  isCurrentVolunteerTermsVersion,
  isCurrentAdoptionTermsVersion,
  isCurrentShelterOnboardingTermsVersion,
  getVolunteerTermsLabel,
  getAdoptionTermsLabel,
  getShelterOnboardingTermsLabel,
} from '@/modules/shelter/domain/legal';

describe('legal/index — exports', () => {
  it('todas as versões estão exportadas e não-vazias', () => {
    expect(VOLUNTEER_TERMS_VERSION).toBeTruthy();
    expect(ADOPTION_TERMS_VERSION).toBeTruthy();
    expect(SHELTER_ONBOARDING_TERMS_VERSION).toBeTruthy();
    expect(CONSENT_VERSION).toBeTruthy();
    expect(TERMS_OF_USE_VERSION).toBeTruthy();
    expect(PRIVACY_POLICY_VERSION).toBeTruthy();
    expect(LEGAL_NOTICES_VERSION).toBeTruthy();
    expect(CODE_OF_CONDUCT_VERSION).toBeTruthy();
    expect(ANIMAL_LEGISLATION_VERSION).toBeTruthy();
    expect(DONATION_TERMS_VERSION).toBeTruthy();
    expect(FOSTER_TERMS_VERSION).toBeTruthy();
  });

  it('todos os textos integrais são strings com > 1.000 caracteres', () => {
    expect(typeof VOLUNTEER_TERMS_TEXT).toBe('string');
    expect(VOLUNTEER_TERMS_TEXT.length).toBeGreaterThan(1000);
    expect(ADOPTION_TERMS_TEXT.length).toBeGreaterThan(1000);
    expect(SHELTER_ONBOARDING_TERMS_TEXT.length).toBeGreaterThan(1000);
    expect(COOKIE_POLICY_TEXT.length).toBeGreaterThan(1000);
    expect(TERMS_OF_USE_TEXT.length).toBeGreaterThan(1000);
    expect(PRIVACY_POLICY_TEXT.length).toBeGreaterThan(1000);
    expect(LEGAL_NOTICES_TEXT.length).toBeGreaterThan(1000);
    expect(CODE_OF_CONDUCT_TEXT.length).toBeGreaterThan(1000);
    expect(ANIMAL_LEGISLATION_TEXT.length).toBeGreaterThan(1000);
  });
});

describe('legal/index — LEGAL_PAGES', () => {
  it('tem 10 páginas (6 estáticas + 4 ações: doacoes, voluntariado/LT, LT standalone, adesao abrigos)', () => {
    // 10 a partir da v2 (Viralata_Documentos_Legais_Completos_v2.zip)
    expect(LEGAL_PAGES).toHaveLength(10);
  });

  it('todas as páginas têm slug, title, description e version', () => {
    LEGAL_PAGES.forEach((p) => {
      expect(p.slug).toMatch(/^[a-z-]+$/);
      expect(typeof p.title).toBe('string');
      expect(typeof p.description).toBe('string');
      // Debug helper: loga qual página está com version undefined
      if (typeof p.version !== 'string') {
        // eslint-disable-next-line no-console
        console.error('LEGAL_PAGE sem version:', JSON.stringify(p));
      }
      expect(typeof p.version).toBe('string');
    });
  });

  it('slugs esperados estão presentes', () => {
    const slugs = LEGAL_PAGES.map((p) => p.slug);
    // Estáticas
    expect(slugs).toContain('termos-de-uso');
    expect(slugs).toContain('politica-de-privacidade');
    expect(slugs).toContain('avisos-legais');
    expect(slugs).toContain('codigo-de-conduta');
    expect(slugs).toContain('cookies');
    expect(slugs).toContain('legislacao-animal');
    // Ações (v2)
    expect(slugs).toContain('politica-doacoes');
    expect(slugs).toContain('termos-voluntariado-lar-temporario');
    expect(slugs).toContain('termo-lar-temporario');
    expect(slugs).toContain('termo-adesao-abrigos-ong');
  });

  it('slugs são únicos', () => {
    const slugs = LEGAL_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getLegalPageBySlug retorna a página certa', () => {
    const p = getLegalPageBySlug('cookies');
    expect(p).toBeTruthy();
    expect(p.title).toBe('Política de Cookies');
  });

  it('getLegalPageBySlug retorna o termo de adesão (v2)', () => {
    const p = getLegalPageBySlug('termo-adesao-abrigos-ong');
    expect(p).toBeTruthy();
    expect(p.title).toBe('Termo de Adesão para Abrigos/ONGs');
  });

  it('getLegalPageBySlug retorna null para slug inválido', () => {
    expect(getLegalPageBySlug('nao-existe')).toBeNull();
    expect(getLegalPageBySlug('')).toBeNull();
  });
});

describe('legal/index — helpers de aceite', () => {
  it('buildConsentRecord cria payload com version + at + UA', () => {
    const rec = buildConsentRecord(true, 'Mozilla/5.0 test');
    expect(rec.consent).toBe('accepted');
    expect(rec.version).toBe(CONSENT_VERSION);
    expect(rec.userAgent).toBe('Mozilla/5.0 test');
    expect(rec.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('buildConsentRecord funciona sem userAgent', () => {
    const rec = buildConsentRecord(false, null);
    expect(rec.consent).toBe('rejected');
    expect(rec.userAgent).toBeNull();
  });

  it('buildAdoptionTermsAcceptance exige signature_text >= 3 chars', () => {
    const a = buildAdoptionTermsAcceptance('Maria Silva');
    expect(a.signature_text).toBe('Maria Silva');
    expect(a.terms_version).toBe(ADOPTION_TERMS_VERSION);
    expect(a.terms_accepted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(() => buildAdoptionTermsAcceptance('A')).toThrow();
    expect(() => buildAdoptionTermsAcceptance('')).toThrow();
    expect(() => buildAdoptionTermsAcceptance(null)).toThrow();
  });

  it('buildShelterOnboardingAcceptance valida CPF + nome + cargo', () => {
    const a = buildShelterOnboardingAcceptance({
      legal_rep_name: 'João da Silva',
      legal_rep_cpf: '123.456.789-00',
      legal_rep_role: 'Presidente',
      cnpj: '12.345.678/0001-90',
    });
    expect(a.signature_cpf).toBe('12345678900');
    expect(a.cnpj).toBe('12345678000190');
    expect(a.signature_role).toBe('Presidente');
    expect(a.terms_version).toBe(SHELTER_ONBOARDING_TERMS_VERSION);

    // CPF inválido
    expect(() => buildShelterOnboardingAcceptance({
      legal_rep_name: 'João da Silva',
      legal_rep_cpf: '123',
      legal_rep_role: 'Presidente',
    })).toThrow();
    // Nome curto
    expect(() => buildShelterOnboardingAcceptance({
      legal_rep_name: 'A',
      legal_rep_cpf: '123.456.789-00',
      legal_rep_role: 'Presidente',
    })).toThrow();
    // Sem cargo
    expect(() => buildShelterOnboardingAcceptance({
      legal_rep_name: 'João da Silva',
      legal_rep_cpf: '123.456.789-00',
      legal_rep_role: '',
    })).toThrow();
  });

  it('isCurrent*Version detecta versão corrente vs. v1', () => {
    expect(isCurrentVolunteerTermsVersion(VOLUNTEER_TERMS_VERSION)).toBe(true);
    expect(isCurrentVolunteerTermsVersion('2026-07-10')).toBe(false);

    expect(isCurrentAdoptionTermsVersion(ADOPTION_TERMS_VERSION)).toBe(true);
    expect(isCurrentAdoptionTermsVersion('1900-01-01')).toBe(false);

    expect(isCurrentShelterOnboardingTermsVersion(SHELTER_ONBOARDING_TERMS_VERSION)).toBe(true);
    expect(isCurrentShelterOnboardingTermsVersion('1900-01-01')).toBe(false);
  });

  it('get*Label retorna label com versão', () => {
    expect(getVolunteerTermsLabel()).toContain(VOLUNTEER_TERMS_VERSION);
    expect(getAdoptionTermsLabel()).toContain(ADOPTION_TERMS_VERSION);
    expect(getShelterOnboardingTermsLabel()).toContain(SHELTER_ONBOARDING_TERMS_VERSION);
  });
});
