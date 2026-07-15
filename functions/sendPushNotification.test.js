/**
 * @fileoverview Unit tests for sendPushNotification callable + sendPushNotificationCore.cjs.
 * TASK-292: FCM v1 integration.
 */

'use strict';

const { validateInput, sendPushCore, NOTIFICATION_TYPE_META, ALLOWED_TYPES } = require('./sendPushNotificationCore.cjs');

describe('sendPushNotificationCore', () => {
  describe('NOTIFICATION_TYPE_META', () => {
    it('should have all expected notification types', () => {
      const expected = [
        'adoption_workflow_created',
        'adoption_workflow_status',
        'kanban_task_created',
        'kanban_task_due',
        'kanban_task_overdue',
        'milestone_due',
        'milestone_overdue',
        'volunteer_shift_reminder',
        'post_adoption_returned',
      ];
      expect(ALLOWED_TYPES).toEqual(expected);
      expected.forEach((type) => {
        expect(NOTIFICATION_TYPE_META[type]).toBeDefined();
        expect(NOTIFICATION_TYPE_META[type].title).toBeTruthy();
        expect(NOTIFICATION_TYPE_META[type].defaultBody).toBeTruthy();
      });
    });
  });

  describe('validateInput', () => {
    it('should accept valid minimal input', () => {
      const result = validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created' });
      expect(result).toEqual({ ok: true });
    });

    it('should accept valid full input', () => {
      const result = validateInput({
        recipientUid: 'uid123',
        type: 'kanban_task_created',
        title: 'Test notification',
        body: 'This is a test body.',
        link: '/path/to/page',
        data: { key: 'value' },
      });
      expect(result).toEqual({ ok: true });
    });

    it('should reject missing recipientUid', () => {
      expect(validateInput({ type: 'adoption_workflow_created' })).toEqual({
        ok: false,
        error: 'recipientUid is required and must be a string',
      });
    });

    it('should reject non-string recipientUid', () => {
      expect(validateInput({ recipientUid: 123, type: 'adoption_workflow_created' })).toEqual({
        ok: false,
        error: 'recipientUid is required and must be a string',
      });
    });

    it('should reject missing type', () => {
      expect(validateInput({ recipientUid: 'uid123' })).toEqual({
        ok: false,
        error: 'type is required and must be a string',
      });
    });

    it('should reject unsupported notification type', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'unknown_type' })).toEqual({
        ok: false,
        error: 'type "unknown_type" is not supported. Allowed: adoption_workflow_created, adoption_workflow_status, kanban_task_created, kanban_task_due, kanban_task_overdue, milestone_due, milestone_overdue, volunteer_shift_reminder, post_adoption_returned',
      });
    });

    it('should reject empty title', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', title: '' })).toEqual({
        ok: false,
        error: 'title must be a non-empty string if provided',
      });
    });

    it('should reject whitespace-only title', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', title: '   ' })).toEqual({
        ok: false,
        error: 'title must be a non-empty string if provided',
      });
    });

    it('should reject title > 140 chars', () => {
      const longTitle = 'a'.repeat(141);
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', title: longTitle })).toEqual({
        ok: false,
        error: 'title must be 140 characters or fewer',
      });
    });

    it('should accept title exactly 140 chars', () => {
      const title = 'a'.repeat(140);
      const result = validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', title });
      expect(result).toEqual({ ok: true });
    });

    it('should reject empty body', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', body: '' })).toEqual({
        ok: false,
        error: 'body must be a non-empty string if provided',
      });
    });

    it('should reject body > 300 chars', () => {
      const longBody = 'a'.repeat(301);
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', body: longBody })).toEqual({
        ok: false,
        error: 'body must be 300 characters or fewer',
      });
    });

    it('should accept body exactly 300 chars', () => {
      const body = 'a'.repeat(300);
      const result = validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', body });
      expect(result).toEqual({ ok: true });
    });

    it('should reject non-string link', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', link: 123 })).toEqual({
        ok: false,
        error: 'link must be a string if provided',
      });
    });

    it('should accept valid link', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', link: '/shelter/club1/tasks/123' })).toEqual({
        ok: true,
      });
    });

    it('should reject null/undefined data (not an object)', () => {
      expect(validateInput({ recipientUid: 'uid123', type: 'adoption_workflow_created', data: null })).toEqual({
        ok: false,
        error: 'data must be an object',
      });
    });

    it('should reject non-object input', () => {
      expect(validateInput(null)).toEqual({
        ok: false,
        error: 'data must be an object',
      });
    });
  });

  describe('sendPushCore', () => {
    const mockDb = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
        })),
      })),
    };

    const mockMessaging = {
      send: jest.fn(),
    };

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should skip when user not found', async () => {
      const userDocRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(userDocRef),
      });

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'ghost', type: 'adoption_workflow_created' },
        actorUid: 'actor',
      });

      expect(result).toEqual({ ok: false, sent: 0, failed: 0, skipped: 1, errors: ['user_not_found'] });
    });

    it('should skip when user has no fcm_tokens', async () => {
      const userDocRef = { get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }) };
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(userDocRef),
      });

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'adoption_workflow_created' },
        actorUid: 'actor',
      });

      expect(result).toEqual({ ok: false, sent: 0, failed: 0, skipped: 1, errors: ['no_tokens'] });
    });

    it('should skip when all tokens are invalid', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            fcm_tokens: [{ token: null }, { token: undefined }, { token: '' }],
          }),
        }),
      };
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(userDocRef),
      });

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'adoption_workflow_created' },
        actorUid: 'actor',
      });

      expect(result).toEqual({ ok: false, sent: 0, failed: 0, skipped: 3, errors: ['no_valid_tokens'] });
    });

    it('should send notification to valid tokens', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            fcm_tokens: [
              { token: 'valid_token_1', created_at: new Date() },
              { token: 'valid_token_2', created_at: new Date() },
            ],
          }),
        }),
      };

      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(notifDocRef),
        });

      mockMessaging.send.mockResolvedValue('msg-id-ok');

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'kanban_task_created', title: 'Test', body: 'Body' },
        actorUid: 'actor',
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockMessaging.send).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed token success/failure', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            fcm_tokens: [{ token: 'token_ok' }, { token: 'token_fail' }],
          }),
        }),
      };

      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(userDocRef),
        })
        .mockReturnValueOnce({
          doc: jest.fn().mockReturnValue(notifDocRef),
        });

      mockMessaging.send
        .mockResolvedValueOnce('msg-id-ok')
        .mockRejectedValueOnce(new Error('invalid-registration'));

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'adoption_workflow_status' },
        actorUid: 'actor',
      });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('invalid-registration');
    });

    it('should truncate title to 140 chars', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }] }),
        }),
      };
      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(userDocRef) })
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(notifDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: {
          recipientUid: 'uid',
          type: 'adoption_workflow_created',
          title: 'A'.repeat(200),
        },
        actorUid: 'actor',
      });

      const sentPayload = mockMessaging.send.mock.calls[0][0];
      expect(sentPayload.notification.title.length).toBe(140);
    });

    it('should truncate body to 300 chars', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }] }),
        }),
      };
      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(userDocRef) })
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(notifDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: {
          recipientUid: 'uid',
          type: 'adoption_workflow_created',
          body: 'B'.repeat(400),
        },
        actorUid: 'actor',
      });

      const sentPayload = mockMessaging.send.mock.calls[0][0];
      expect(sentPayload.notification.body.length).toBe(300);
    });

    it('should use default title from NOTIFICATION_TYPE_META when not provided', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }] }),
        }),
      };
      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(userDocRef) })
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(notifDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'kanban_task_created' },
        actorUid: 'actor',
      });

      const sentPayload = mockMessaging.send.mock.calls[0][0];
      expect(sentPayload.notification.title).toBe(NOTIFICATION_TYPE_META.kanban_task_created.title);
    });

    it('should respect dryRun=true (no actual send)', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }, { token: 'tok2' }] }),
        }),
      };
      mockDb.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(userDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      const result = await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: { recipientUid: 'uid', type: 'adoption_workflow_created' },
        actorUid: 'actor',
        dryRun: true,
      });

      expect(result.sent).toBe(2);
      expect(mockMessaging.send).not.toHaveBeenCalled();
    });

    it('should include link in FCM data payload when provided', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }] }),
        }),
      };
      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(userDocRef) })
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(notifDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: {
          recipientUid: 'uid',
          type: 'adoption_workflow_created',
          link: '/shelter/club1/apps/app123',
        },
        actorUid: 'actor',
      });

      const sentPayload = mockMessaging.send.mock.calls[0][0];
      expect(sentPayload.data.link).toBe('/shelter/club1/apps/app123');
    });

    it('should include extra data in FCM data payload', async () => {
      const userDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ fcm_tokens: [{ token: 'tok1' }] }),
        }),
      };
      const notifDocRef = { set: jest.fn().mockResolvedValue() };
      mockDb.collection
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(userDocRef) })
        .mockReturnValueOnce({ doc: jest.fn().mockReturnValue(notifDocRef) });
      mockMessaging.send.mockResolvedValue('ok');

      await sendPushCore({
        db: mockDb,
        messaging: mockMessaging,
        logger: mockLogger,
        data: {
          recipientUid: 'uid',
          type: 'adoption_workflow_created',
          data: { applicationId: 'app123', clubId: 'club1' },
        },
        actorUid: 'actor',
      });

      const sentPayload = mockMessaging.send.mock.calls[0][0];
      expect(sentPayload.data.applicationId).toBe('app123');
      expect(sentPayload.data.clubId).toBe('club1');
    });
  });
});
