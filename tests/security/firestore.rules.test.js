/**
 * @fileoverview Tests estruturais de Firestore rules para multi-tenant
 * volunteer (TASK-212).
 *
 * Sem emulator rodando, valida-se apenas a ESTRUTURA do firestore.rules
 * (que está bem isolado em helpers, multi-tenant, anti-abusos).
 *
 * Cobertura completa de regras precisaria do emulador Firebase Rules
 * Unit Testing. Estruturalmente garantimos:
 * - Volunteer vê só suas próprias participações
 * - Volunteer_uid IMUTÁVEL em update
 * - event_date congelado se passou > 24h
 * - Self-service check-in/out permitido
 * - Platform admin bypass
 * - isVolunteerInRoster valida status + bg_check
 * - Cross-tenant impossível
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RULES = fs.readFileSync(
  path.join(__dirname, '../../firestore.rules'),
  'utf-8',
);

describe('firestore.rules — TASK-212 (multi-tenant volunteer)', () => {
  it('regra volunteer_participations existe', () => {
    expect(RULES).toMatch(/match \/volunteer_participations\/\{participationId\}/);
  });

  it('regra volunteer_participations tem isolamento por auth.uid (read)', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toMatch(/resource\.data\.volunteer_uid == request\.auth\.uid/);
  });

  it('regra volunteer_participations tem volunteerUid IMUTÁVEL em update', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toMatch(/request\.resource\.data\.volunteer_uid == resource\.data\.volunteer_uid/);
  });

  it('regra tem event_date IMUTÁVEL após 24h', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    // Check que existe a regra que congela event_date se passou
    expect(block).toMatch(/event_date >= request\.time/);
  });

  it('regra tem self-service check-in/out (hasOnly)', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toMatch(/hasOnly/);
    expect(block).toMatch(/check_in/);
    expect(block).toMatch(/check_out/);
  });

  it('regra tem platform admin bypass', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toMatch(/isPlatformAdmin\(\)/);
  });

  it('isVolunteerInRoster helper existe e valida status + bg_check', () => {
    expect(RULES).toContain('function isVolunteerInRoster');
    expect(RULES).toContain("status == 'active'");
    expect(RULES).toContain('background_check_status');
  });

  it('isVolunteerInRoster é usado em create de volunteer_participations', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toMatch(/isVolunteerInRoster/);
  });

  it('regra volunteers (subcoleção) tem isolamento por abrigo (path clubId)', () => {
    const idx = RULES.indexOf('match /volunteers/{volunteerId}');
    const block = RULES.substring(idx, idx + 5000);
    expect(block).toMatch(/clubId/);
  });

  it('regra volunteer_profile tem ownership por uid', () => {
    const idx = RULES.indexOf('match /volunteer_profile/{profileId}');
    const block = RULES.substring(idx, idx + 5000);
    expect(block).toContain('request.auth.uid');
  });

  it('regra App Check gate em volunteer_participations (TASK-226)', () => {
    const idx = RULES.indexOf('match /volunteer_participations/{participationId}');
    const block = RULES.substring(idx, idx + 4000);
    expect(block).toContain('isAppCheckVerified');
  });

  // ─── V4 PERSONAS (D-PERSONA-MULTI) ──────────────────────────────────────
  describe('V4 PERSONAS — users/{userId} campos active_persona e personas_enabled', () => {
    it('regra users/{userId} update valida active_persona (string)', () => {
      const idx = RULES.indexOf('match /users/{userId}');
      const block = RULES.substring(idx, idx + 4000);
      expect(block).toContain('active_persona');
      expect(block).toContain("is string");
    });

    it('regra users/{userId} update valida personas_enabled (array)', () => {
      const idx = RULES.indexOf('match /users/{userId}');
      const block = RULES.substring(idx, idx + 4000);
      expect(block).toContain('personas_enabled');
      expect(block).toContain('is list');
    });

    it('personaKey format regex (D-PERSONA-MULTI): tipo:scopeId ou só tipo', () => {
      const idx = RULES.indexOf('match /users/{userId}');
      const block = RULES.substring(idx, idx + 4000);
      // Regex: ^([a-z_]+)(:[A-Za-z0-9_-]+)?$
      expect(block).toMatch(/matches\('\^\[a-z_\]\+\(:\[A-Za-z0-9_-\]\{1,128\}\)\?\$'\)/);
    });

    it('personas_enabled limitado a 16 personas max', () => {
      const idx = RULES.indexOf('match /users/{userId}');
      const block = RULES.substring(idx, idx + 4000);
      expect(block).toContain('.size() <= 16');
    });

    it('user NÃO pode setar role=platform_admin (exceto owner fixo)', () => {
      const idx = RULES.indexOf('match /users/{userId}');
      const block = RULES.substring(idx, idx + 4000);
      // role precisa ser igual ou platform_owner_auth
      expect(block).toContain('isPlatformOwnerAuth()');
    });
  });
});
