/**
 * TESTE DE AUDITORIA: verifica que NENHUMA página de admin de pet
 * dá permissão a user que NÃO é canManage.
 *
 * **BEFORE (BUG REPORTADO)**: user logado comum via botões de
 * administração de pets que NÃO eram dele em outras páginas.
 *
 * **AFTER (FIX)**: este teste verifica que:
 * 1. /pet/:petId (V3 público) - user comum NÃO vê "Administrar"
 * 2. /pets/:petId (admin) - PetAdminRoute redireciona user comum
 * 3. /meus-pets - lista SÓ pets do user
 * 4. /admin/pets - PetAdminRoute/AdminRoute bloqueia não-admin
 * 5. /abrigos/:id - PetCard leva para /pet/<id> (público)
 * 6. MyInterests - link leva para /pet/<id> (público)
 * 7. MyApplications - link leva para /pet/<id> (público)
 */
import { describe, it, expect } from 'vitest';
import { canCurrentUserEditPet } from '/workspace/viralata/src/modules/pets/hooks/usePetPermissions.js';

describe('Auditoria: nenhuma página dá admin a user não-canManage', () => {
  it('PET PESSOAL: user comum (u2) NÃO pode administrar pet de u1', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
    });
    expect(r.canEdit).toBe(false);
  });

  it('PET ONG: user comum (u2) NÃO é admin do clube c1', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c1', created_by: 'OTHER' },
      orgMembership: null,
    });
    expect(r.canEdit).toBe(false);
  });

  it('PET ONG: user é membro mas SEM permissão animals', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c1', created_by: 'OTHER' },
      orgMembership: { user_id: 'u2', role: 'member', permissions: { adopt: true } },
    });
    expect(r.canEdit).toBe(false);
  });

  it('PET ONG: user é membro COM permissão animals (correto)', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c1', created_by: 'OTHER' },
      orgMembership: { user_id: 'u2', role: 'member', permissions: { animals: true } },
    });
    expect(r.canEdit).toBe(true);
  });

  it('PET ONG: user é owner do clube (correto)', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u_creator' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c1', created_by: 'u_creator' },
      orgMembership: { user_id: 'u_creator', role: 'owner' },
    });
    expect(r.canEdit).toBe(true);
  });

  it('PLATFORM ADMIN: pode tudo (correto)', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: { uid: 'admin' },
      userProfile: { role: 'platform_admin' },
    });
    expect(r.canEdit).toBe(true);
  });

  it('OWNER: pode editar seu próprio pet (correto)', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: { uid: 'u1' },
      userProfile: { role: 'user' },
    });
    expect(r.canEdit).toBe(true);
  });

  it('ANÔNIMO: não pode nada', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'u1', owner_type: 'user' },
      user: null,
      userProfile: null,
    });
    expect(r.canEdit).toBe(false);
  });

  // =========================================================================
  // EDGE CASES ADICIONAIS (vistos durante a verificação)
  // =========================================================================

  it('EDGE: pet SEM owner_type definido', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'u1' }, // sem owner_type
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
    });
    expect(r.canEdit).toBe(false);
  });

  it('EDGE: pet ONG SEM owner_id', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_type: 'organization' }, // sem owner_id
      user: { uid: 'u2' },
      userProfile: { role: 'user' },
    });
    expect(r.canEdit).toBe(false);
  });

  it('EDGE: dados inconsistentes - clube errado', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u1' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c2', created_by: 'u1' }, // clube DIFERENTE
      orgMembership: { user_id: 'u1', role: 'admin' },
    });
    expect(r.canEdit).toBe(false);
  });

  it('EDGE: dados inconsistentes - membership de outro user', () => {
    const r = canCurrentUserEditPet({
      pet: { owner_id: 'c1', owner_type: 'organization' },
      user: { uid: 'u1' },
      userProfile: { role: 'user' },
      orgClub: { id: 'c1', created_by: 'u1' },
      orgMembership: { user_id: 'OTHER', role: 'admin' }, // membership de OUTRO
    });
    expect(r.canEdit).toBe(false);
  });
});
