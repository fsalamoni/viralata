import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { getMembership } from '@/modules/organizations/services/clubService';
import { getClub } from '@/modules/organizations/services/clubService';
import {
  hasClubPermission,
  isClubOwner,
} from '@/modules/organizations/domain/permissions';
import { CLUB_PERMISSION } from '@/modules/organizations/domain/constants';

/**
 * Decide se o usuário pode editar/deletar um pet, espelhando as regras do
 * Firestore (defense-in-depth: regras + service + UI).
 *
 * Cenários de permissão:
 * 1. Pet é pessoal (owner_type !== 'organization') E user.uid === pet.owner_id
 * 2. Pet é da ONG (owner_type === 'organization') E user é membro da ONG com
 *    permissão granular `animals` (= edit_pets na permissions map) ou é admin
 * 3. User é platform_admin (override do owner do projeto)
 *
 * Centraliza a lógica pra evitar divergência entre regras do Firestore,
 * service layer e UI.
 *
 * @param {object|null} pet
 * @returns {{ canEdit: boolean, canDelete: boolean, reason: string|null }}
 *   `reason` descreve POR QUE o usuário não pode editar (string PT-BR ou null
 *   quando pode). Útil pra UX explicar o bloqueio.
 */
export function usePetPermissions(pet) {
  const { user, isPlatformAdmin } = useAuth();
  const ownerIsOrg = Boolean(pet?.owner_type === 'organization' && pet?.owner_id);
  const isOrgPet = ownerIsOrg;
  const targetClubId = isOrgPet ? pet.owner_id : null;

  // Membership na ONG dona do pet (apenas quando relevante)
  const { data: myMembership } = useQuery({
    queryKey: ['pet-perm', 'membership', targetClubId, user?.uid],
    queryFn: () => getMembership(targetClubId, user.uid),
    enabled: Boolean(isOrgPet && user?.uid && targetClubId),
    staleTime: 1000 * 60 * 2,
  });

  // Documento do clube (necessário para checar se user é owner do clube)
  const { data: club } = useQuery({
    queryKey: ['pet-perm', 'club', targetClubId],
    queryFn: () => getClub(targetClubId),
    enabled: Boolean(isOrgPet && targetClubId),
    staleTime: 1000 * 60 * 5,
  });

  // Sem pet ou sem usuário: nada a fazer
  if (!pet || !user) {
    return { canEdit: false, canDelete: false, reason: 'Faça login para gerenciar pets.' };
  }

  // Platform admin pode tudo
  if (isPlatformAdmin) {
    return { canEdit: true, canDelete: true, reason: null };
  }

  // Pet pessoal: precisa ser o owner
  if (!isOrgPet) {
    if (user.uid === pet.owner_id) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Você não é o responsável por este pet.',
    };
  }

  // Pet de ONG: checa membership + permissão granular
  if (myMembership && club) {
    const isOwnerOfClub = isClubOwner(club, myMembership);
    const hasAnimalsPerm = hasClubPermission(club, myMembership, CLUB_PERMISSION.ANIMALS);
    if (isOwnerOfClub || hasAnimalsPerm) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Você faz parte da organização, mas não tem permissão para gerenciar os animais dela.',
    };
  }

  // Pet de ONG sem membership carregada ainda (em fetching) ou usuário
  // realmente não é membro
  return {
    canEdit: false,
    canDelete: false,
    reason: isOrgPet
      ? 'Apenas membros da organização responsável podem gerenciar este pet.'
      : 'Você não é o responsável por este pet.',
  };
}

/**
 * Versão pura (sem React Query) para uso no service layer.
 * NÃO toca no banco — recebe a pet já carregada E o membership do usuário.
 *
 * @param {object|null} pet
 * @param {object|null} user  objeto FirebaseUser (precisa de .uid) — null = anônimo
 * @param {object|null} userProfile  profile do usuário (precisa de .role)
 * @param {object|null} orgMembership  { role, permissions } ou null
 * @param {object|null} orgClub  clube do pet (precisa de .created_by) — apenas pra org pet
 * @returns {{ canEdit: boolean, canDelete: boolean, reason: string|null }}
 */
export function canCurrentUserEditPet({ pet, user, userProfile, orgMembership, orgClub }) {
  if (!pet || !user) {
    return { canEdit: false, canDelete: false, reason: 'Faça login para gerenciar pets.' };
  }
  const isPlatformAdmin = userProfile?.role === 'platform_admin';
  if (isPlatformAdmin) {
    return { canEdit: true, canDelete: true, reason: null };
  }
  const isOrgPet = pet.owner_type === 'organization';
  if (!isOrgPet) {
    if (user.uid === pet.owner_id) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Você não é o responsável por este pet.',
    };
  }
  if (orgMembership && orgClub) {
    const hasPermission =
      isClubOwner(orgClub, orgMembership) ||
      hasClubPermission(orgClub, orgMembership, CLUB_PERMISSION.ANIMALS);
    if (hasPermission) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Você faz parte da organização, mas não tem permissão para gerenciar os animais dela.',
    };
  }
  return {
    canEdit: false,
    canDelete: false,
    reason: 'Apenas membros da organização responsável podem gerenciar este pet.',
  };
}
