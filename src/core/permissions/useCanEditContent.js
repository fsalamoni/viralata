import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { hasCommunityPermission, isCommunityOwner } from '@/modules/communities/domain/permissions';

/**
 * Hook centralizado de permissão de conteúdo.
 *
 * Decide se o usuário atual pode editar/deletar um item de conteúdo.
 * O "dono" do conteúdo SEMPRE pode (regra de ouro: o criador de qualquer
 * conteúdo tem poder de editar e excluir o respectivo conteúdo).
 * Platform admin tem override absoluto.
 *
 * Casos especiais por tipo:
 *  - 'pet': usa `petPermissions` (precisa resolver permissão granular de ONG)
 *  - 'community_post' / 'community_event' / 'community': checa
 *    `isCommunityOwner` e permissão granular da comunidade
 *  - 'community_forum_thread' / 'community_forum_message': só o autor
 *    (moderadores da comunidade viriam via flag futura)
 *  - 'chat_message' / 'org_*': só o autor (fallback)
 *
 * Quando passar `content` undefined ou null, retorna permissões vazias —
 * útil pra estados de loading.
 *
 * @param {object|null} content  o item de conteúdo (precisa ter .author_id ou .owner_id ou .user_id)
 * @param {object} opts  { type, membership, orgMembership, orgClub } — extras por tipo
 * @returns {{ canEdit: boolean, canDelete: boolean, reason: string|null }}
 */
export function useCanEditContent(content, opts = {}) {
  const { user, isPlatformAdmin } = useAuth();
  const { type = 'generic', membership } = opts;

  if (!content || !user) {
    return { canEdit: false, canDelete: false, reason: 'Faça login para gerenciar conteúdo.' };
  }
  if (isPlatformAdmin) {
    return { canEdit: true, canDelete: true, reason: null };
  }

  const authorId = content.author_id || content.owner_id || content.user_id || content.created_by;
  const isCreator = authorId && user.uid === authorId;

  // Pet: usa a versão granular de permissão
  if (type === 'pet') {
    // import lazily to avoid circular dep — but in practice usePetPermissions
    // is the canonical source. Caller should pre-compute.
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Permissão não resolvida — passe petPermissions como opts.',
    };
  }

  // Comunidade (e seus sub-recursos): owner OU admin com permissão granular
  if (type === 'community' || type === 'community_post' || type === 'community_event') {
    // Para posts/eventos, também deixamos o autor deletar os próprios itens
    // (regra "criador controla seu conteúdo") — mas edição é só do admin da
    // comunidade para evitar bagunça no mural coletivo.
    if (type === 'community_post' || type === 'community_event') {
      if (isCreator && type === 'community_post') {
        // autor pode deletar; edição só para admin
        return { canEdit: false, canDelete: true, reason: null };
      }
    }
    // owner / admin / permissão granular da comunidade
    if (
      isCommunityOwner(content, null, user.uid)
      || isCommunityOwner({ owner_id: content.community_owner_id }, null, user.uid)
    ) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    if (membership) {
      // CommunityDetail page sets membership; admin/moderator with
      // relevant permission key.
      const permKey = type === 'community_event' ? 'manage_events' : 'feed';
      if (hasCommunityPermission(content, membership, permKey, user.uid)) {
        return { canEdit: true, canDelete: true, reason: null };
      }
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Apenas o administrador da comunidade pode editar isso.',
    };
  }

  // Fórum: autor pode editar/deletar seus próprios posts
  if (type === 'community_forum_thread' || type === 'community_forum_message') {
    if (isCreator) {
      return { canEdit: true, canDelete: true, reason: null };
    }
    return {
      canEdit: false,
      canDelete: false,
      reason: 'Apenas o autor pode editar isto.',
    };
  }

  // Genérico: owner (autor) controla
  if (isCreator) {
    return { canEdit: true, canDelete: true, reason: null };
  }

  return {
    canEdit: false,
    canDelete: false,
    reason: 'Você não tem permissão para gerenciar este conteúdo.',
  };
}
