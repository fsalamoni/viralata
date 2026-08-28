/**
 * @fileoverview Testes das notificações acionáveis (Fase 0 —
 * SHELTER_ACTIONABLE_NOTIFICATIONS_V1): campos de ação aditivos no payload e
 * `updateNotificationActionState`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setMock = vi.fn();
const commitMock = vi.fn(() => Promise.resolve());
const updateDocMock = vi.fn(() => Promise.resolve());
const docMock = vi.fn((...segments) => ({ _segments: segments }));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => ({ _collection: args }),
  doc: (...args) => docMock(...args),
  serverTimestamp: () => ({ _isServerTimestamp: true }),
  updateDoc: (...args) => updateDocMock(...args),
  writeBatch: () => ({ set: setMock, commit: commitMock }),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { _isMockDb: true },
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const {
  buildNotificationActionFields,
  createNotification,
  notifyUsers,
  updateNotificationActionState,
  NOTIFICATION_ACTION_KIND,
  NOTIFICATION_ACTION_STATE,
} = await import('./notificationService.js');

describe('notificationService — buildNotificationActionFields (Fase 0)', () => {
  it('retorna as três chaves como null quando não há ação', () => {
    expect(buildNotificationActionFields(undefined)).toEqual({
      action_kind: null,
      action_ref: null,
      action_state: null,
    });
  });

  it('retorna null quando o kind é desconhecido', () => {
    const r = buildNotificationActionFields({ kind: 'coisa_invalida', ref: { x: 1 } });
    expect(r).toEqual({ action_kind: null, action_ref: null, action_state: null });
  });

  it('constrói campos para um kind válido e usa pending como estado default', () => {
    const r = buildNotificationActionFields({
      kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
      ref: { clubId: 'c1', inviteId: 'c1_u1' },
    });
    expect(r.action_kind).toBe(NOTIFICATION_ACTION_KIND.CLUB_INVITE);
    expect(r.action_state).toBe(NOTIFICATION_ACTION_STATE.PENDING);
    expect(r.action_ref).toEqual({ clubId: 'c1', inviteId: 'c1_u1' });
  });

  it('respeita um estado válido informado', () => {
    const r = buildNotificationActionFields({
      kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
      ref: { clubId: 'c1' },
      state: NOTIFICATION_ACTION_STATE.ACCEPTED,
    });
    expect(r.action_state).toBe(NOTIFICATION_ACTION_STATE.ACCEPTED);
  });

  it('cai para pending quando o estado informado é inválido', () => {
    const r = buildNotificationActionFields({
      kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
      ref: { clubId: 'c1' },
      state: 'estado_qualquer',
    });
    expect(r.action_state).toBe(NOTIFICATION_ACTION_STATE.PENDING);
  });

  it('sanitiza action_ref: mantém string/número/boolean e descarta o resto', () => {
    const r = buildNotificationActionFields({
      kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
      ref: {
        clubId: 'c1',
        n: 5,
        b: true,
        nested: { a: 1 },
        arr: [1, 2],
        undef: undefined,
        fn: () => {},
      },
    });
    expect(r.action_ref).toEqual({ clubId: 'c1', n: 5, b: true });
  });

  it('action_ref vira null quando não há pares válidos', () => {
    const r = buildNotificationActionFields({
      kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
      ref: { nested: { a: 1 } },
    });
    expect(r.action_ref).toBeNull();
  });

  it('action_ref inválido (array/valor) vira null', () => {
    expect(
      buildNotificationActionFields({ kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE, ref: [1, 2] }).action_ref,
    ).toBeNull();
    expect(
      buildNotificationActionFields({ kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE, ref: 'x' }).action_ref,
    ).toBeNull();
  });
});

describe('notificationService — payload inclui campos de ação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createNotification grava action_kind/ref/state quando action é passado', async () => {
    await createNotification({
      userId: 'u1',
      title: 'Convite',
      type: 'club_invite',
      action: {
        kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE,
        ref: { clubId: 'c1', inviteId: 'c1_u1' },
        state: NOTIFICATION_ACTION_STATE.PENDING,
      },
    });
    expect(setMock).toHaveBeenCalledTimes(1);
    const [, payload] = setMock.mock.calls[0];
    expect(payload.action_kind).toBe(NOTIFICATION_ACTION_KIND.CLUB_INVITE);
    expect(payload.action_ref).toEqual({ clubId: 'c1', inviteId: 'c1_u1' });
    expect(payload.action_state).toBe(NOTIFICATION_ACTION_STATE.PENDING);
  });

  it('createNotification grava nulls de ação quando NÃO há action (retrocompatível)', async () => {
    await createNotification({ userId: 'u1', title: 'Comum', type: 'generic' });
    const [, payload] = setMock.mock.calls[0];
    expect(payload.action_kind).toBeNull();
    expect(payload.action_ref).toBeNull();
    expect(payload.action_state).toBeNull();
    // nunca grava undefined (Firestore rejeita)
    Object.values(payload).forEach((v) => expect(v).not.toBeUndefined());
  });

  it('notifyUsers propaga os campos de ação para cada destinatário', async () => {
    await notifyUsers(['u1', 'u2'], {
      title: 'Convite',
      type: 'club_invite',
      action: { kind: NOTIFICATION_ACTION_KIND.CLUB_INVITE, ref: { clubId: 'c1' } },
    });
    expect(setMock).toHaveBeenCalledTimes(2);
    setMock.mock.calls.forEach(([, payload]) => {
      expect(payload.action_kind).toBe(NOTIFICATION_ACTION_KIND.CLUB_INVITE);
      expect(payload.action_state).toBe(NOTIFICATION_ACTION_STATE.PENDING);
    });
  });
});

describe('notificationService — updateNotificationActionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lança erro para estado inválido', async () => {
    await expect(updateNotificationActionState('n1', 'nope')).rejects.toThrow();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('lança erro se notificationId ausente', async () => {
    await expect(
      updateNotificationActionState('', NOTIFICATION_ACTION_STATE.ACCEPTED),
    ).rejects.toThrow();
  });

  it('grava action_state + read + read_at por padrão', async () => {
    await updateNotificationActionState('n1', NOTIFICATION_ACTION_STATE.ACCEPTED);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, patch] = updateDocMock.mock.calls[0];
    expect(patch.action_state).toBe(NOTIFICATION_ACTION_STATE.ACCEPTED);
    expect(patch.read).toBe(true);
    expect(patch.read_at).toBeTruthy();
  });

  it('não marca como lida quando markRead=false', async () => {
    await updateNotificationActionState('n1', NOTIFICATION_ACTION_STATE.DECLINED, { markRead: false });
    const [, patch] = updateDocMock.mock.calls[0];
    expect(patch.action_state).toBe(NOTIFICATION_ACTION_STATE.DECLINED);
    expect(patch.read).toBeUndefined();
    expect(patch.read_at).toBeUndefined();
  });
});
