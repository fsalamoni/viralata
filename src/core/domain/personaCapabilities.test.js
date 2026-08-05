import { describe, it, expect } from 'vitest';
import { getPersonaCapabilities } from './personaCapabilities.js';
import { PERSONA_TYPE } from './personas.js';

const tos = (nav) => nav.map((i) => i.to);

describe('personaCapabilities', () => {
  it('Feed é EXCLUSIVO do adotante (topbar + barra)', () => {
    const adopter = getPersonaCapabilities({ type: PERSONA_TYPE.ADOPTER });
    expect(tos(adopter.topbarNav)).toContain('/feed');

    for (const type of [
      PERSONA_TYPE.DONOR,
      PERSONA_TYPE.SHELTER_STAFF,
      PERSONA_TYPE.COMMUNITY_STAFF,
      PERSONA_TYPE.VOLUNTEER,
    ]) {
      const cap = getPersonaCapabilities({ type, scopeId: 'x' });
      expect(tos(cap.topbarNav)).not.toContain('/feed');
      expect(tos(cap.bottomNav)).not.toContain('/feed');
    }
  });

  it('doador tem CTA "Cadastrar pet"; adotante não', () => {
    expect(getPersonaCapabilities({ type: PERSONA_TYPE.DONOR }).headerCTAs.map((c) => c.to)).toContain('/pets/new');
    expect(getPersonaCapabilities({ type: PERSONA_TYPE.ADOPTER }).headerCTAs).toHaveLength(0);
  });

  it('personas escopadas resolvem o scopeId na rota', () => {
    // O abrigo não tem navegação escopada na topbar (navega pelas abas do
    // painel) — o scopeId é resolvido na barra inferior (bottomNav).
    const shelter = getPersonaCapabilities({ type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club1' });
    expect(shelter.topbarNav).toHaveLength(0);
    expect(tos(shelter.bottomNav)).toContain('/organizacoes/club1/admin');
    const community = getPersonaCapabilities({ type: PERSONA_TYPE.COMMUNITY_STAFF, scopeId: 'com1' });
    expect(tos(community.topbarNav)).toContain('/comunidade/com1/admin');
  });

  it('aceita PersonaKey string', () => {
    const cap = getPersonaCapabilities('shelter_staff:abc');
    expect(tos(cap.bottomNav).some((t) => t.includes('/organizacoes/abc/'))).toBe(true);
  });

  it('fallback seguro (tipo desconhecido → adotante)', () => {
    const cap = getPersonaCapabilities({ type: 'inexistente' });
    expect(tos(cap.topbarNav)).toContain('/feed');
  });

  it('toda persona tem Perfil na barra inferior', () => {
    for (const type of Object.values(PERSONA_TYPE)) {
      const cap = getPersonaCapabilities({ type, scopeId: 'x' });
      expect(tos(cap.bottomNav)).toContain('/perfil');
    }
  });
});
