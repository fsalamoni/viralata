/**
 * Testes para a função pura `canCurrentUserEditPet` (lógica de permissão
 * extraída do hook `usePetPermissions`). Os testes não tocam em React
 * Query nem Firestore — testam só a decisão baseada nos parâmetros.
 */
import { describe, it, expect } from 'vitest';
import { canCurrentUserEditPet } from './usePetPermissions';

function user(uid, _role) {
  return { uid };
}
function profile(role) {
  return { role };
}
function club(created_by) {
  return { created_by };
}
function membership(user_id, role, permissions) {
  return { user_id, role, permissions };
}

describe('canCurrentUserEditPet', () => {
  it('bloqueia usuário anônimo', () => {
    const out = canCurrentUserEditPet({ pet: { owner_id: 'a', owner_type: 'user' }, user: null, userProfile: null });
    expect(out.canEdit).toBe(false);
    expect(out.canDelete).toBe(false);
    expect(out.reason).toMatch(/login/i);
  });

  it('permite owner direto em pet pessoal', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: user('u1'),
      userProfile: profile('user'),
    });
    expect(out.canEdit).toBe(true);
    expect(out.canDelete).toBe(true);
    expect(out.reason).toBeNull();
  });

  it('bloqueia terceiro em pet pessoal de outro usuário', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: user('u2'),
      userProfile: profile('user'),
    });
    expect(out.canEdit).toBe(false);
    expect(out.reason).toMatch(/responsável/i);
  });

  it('permite platform_admin independente do owner', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: user('admin'),
      userProfile: profile('platform_admin'),
    });
    expect(out.canEdit).toBe(true);
    expect(out.reason).toBeNull();
  });

  it('permite owner do clube editar pets da ONG', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u1'),
      orgMembership: membership('u1', 'member', {}),
    });
    expect(out.canEdit).toBe(true);
  });

  it('permite admin de clube sem permissions explícito (compat com admins antigos)', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u-other'),
      orgMembership: membership('u1', 'admin'),  // sem permissions = tudo
    });
    expect(out.canEdit).toBe(true);
  });

  it('permite membro com permission edit_pets (animals)', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u-other'),
      orgMembership: membership('u1', 'member', { edit_pets: true }),
    });
    expect(out.canEdit).toBe(true);
  });

  it('bloqueia membro SEM permission edit_pets', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u-other'),
      orgMembership: membership('u1', 'member', { edit_pets: false }),
    });
    expect(out.canEdit).toBe(false);
    expect(out.reason).toMatch(/organização/i);
  });

  it('bloqueia usuário não-membro tentando editar pet de ONG', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u-other'),
      orgMembership: null,
    });
    expect(out.canEdit).toBe(false);
    expect(out.reason).toMatch(/membros da organiza/i);
  });

  it('bloqueia platform_admin quando service é chamado com profile sem role platform_admin', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: user('admin'),
      userProfile: profile('user'),  // apenas 'user' = não-admin
    });
    expect(out.canEdit).toBe(false);
  });

  it('mantém compat: pet sem owner_type definido trata como pessoal', () => {
    // pet antigo que não tem owner_type — quem sabe se o owner_id === uid
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'u1' },  // sem owner_type
      user: user('u1'),
      userProfile: profile('user'),
    });
    expect(out.canEdit).toBe(true);
  });

  // ==========================================================================
  // Fallback por currentUserUid — replica o teste do hook React. Importante
  // para o cenário em que a membership do user ainda não carregou (ou nunca
  // existiu — ONG legada sem auto-insert do criador como member), mas o user
  // é o criador da ONG.
  // ==========================================================================

  it('permite criador da ONG sem membership carregar editar pets da ONG', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u1'),  // u1 é o criador
      orgMembership: null,  // mas o doc de membership AINDA não carregou
    });
    expect(out.canEdit).toBe(true);
    expect(out.canDelete).toBe(true);
    expect(out.reason).toBeNull();
  });

  it('permite criador da ONG sem membership NUNCA ter existido (legado)', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('u1'),
      userProfile: profile('user'),
      orgClub: club('u1'),
      orgMembership: null,
    });
    expect(out.canEdit).toBe(true);
  });

  it('continua bloqueando terceiro que não é owner da ONG nem membro', () => {
    const out = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: user('intruso'),
      userProfile: profile('user'),
      orgClub: club('u1'),  // criador é u1, não o intruso
      orgMembership: null,
    });
    expect(out.canEdit).toBe(false);
    expect(out.reason).toMatch(/membros da organiza/i);
  });
});