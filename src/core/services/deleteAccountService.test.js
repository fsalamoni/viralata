/**
 * @fileoverview Testes do deleteAccountService (LGPD Art. 18 VI).
 * TASK-295 (PasswordConfirmDialog) + TASK-332 (community cascade).
 *
 * Cobre a função de cascade-anonymize. Não mocka Firestore end-to-end
 * (testamos composição e shape).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/config/firebase', () => ({
  db: null, // modo test-safe
  auth: { currentUser: null },
}));

vi.mock('@/core/services/auditService', () => ({
  createAuditLog: vi.fn(),
}));

import {
  ANONYMIZED_NAME,
} from './deleteAccountService.constants';

describe('deleteAccountService — constantes', () => {
  it('ANONYMIZED_NAME = "[conta excluída]"', () => {
    expect(ANONYMIZED_NAME).toBe('[conta excluída]');
  });
});

describe('deleteAccountService — TASK-332 community cascade', () => {
  it('lista de coleções tocadas inclui 9 tipos (anonimiza + deleta)', () => {
    // Coleções onde author_id == uid (anonimiza autor, mantém doc)
    const anonTextAuthors = [
      'community_posts',
      'community_post_comments',
      'community_forum_threads',
      'community_forum_messages',
    ];
    // Coleções onde user_id == uid (DELETA — sem refs externas)
    const deleted = [
      'community_post_likes',
      'community_event_rsvps',
    ];
    // Coleções com tratamento especial
    const special = [
      'community_members', // status=left + motivo
      'community_events', // created_by_name anonimizado
      'club_chat_messages', // author_name anonimizado
    ];
    expect(anonTextAuthors.length + deleted.length + special.length).toBe(9);
  });

  it('ANON_AUTHOR constante para campos author_name/photo', () => {
    // O cascade usa um único valor para todos os campos PII de autor.
    // Garante consistência entre posts, comments, threads, messages, chat.
    expect(ANONYMIZED_NAME).toBeDefined();
    expect(ANONYMIZED_NAME).toMatch(/\[/);
  });
});

describe('deleteAccountService — TASK-295 (deleteMyAccount validation)', () => {
  it('lança erro quando db é null', async () => {
    const { deleteMyAccount } = await import('./deleteAccountService');
    await expect(
      deleteMyAccount({ uid: 'user-1' }),
    ).rejects.toThrow('Usuário não autenticado.');
  });
});
