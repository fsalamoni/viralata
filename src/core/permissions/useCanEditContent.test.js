import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', display_name: 'Alice' },
    isAuthenticated: true,
    isPlatformAdmin: false,
  })),
}));

vi.mock('@/modules/communities/domain/permissions', () => ({
  isCommunityOwner: vi.fn(() => false),
  hasCommunityPermission: vi.fn(() => false),
}));

import { useCanEditContent } from './useCanEditContent';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { isCommunityOwner, hasCommunityPermission } from '@/modules/communities/domain/permissions';

describe('useCanEditContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { uid: 'u1' },
      isAuthenticated: true,
      isPlatformAdmin: false,
    });
    isCommunityOwner.mockReturnValue(false);
    hasCommunityPermission.mockReturnValue(false);
  });

  describe('no user', () => {
    it('returns false for null content', () => {
      useAuth.mockReturnValue({ user: null, isAuthenticated: false, isPlatformAdmin: false });
      const { result } = renderHook(() => useCanEditContent(null, { type: 'pet' }));
      expect(result.current.canEdit).toBe(false);
      expect(result.current.canDelete).toBe(false);
    });
  });

  describe('platform admin', () => {
    it('grants all permissions to platform admin', () => {
      useAuth.mockReturnValue({
        user: { uid: 'admin1' },
        isAuthenticated: true,
        isPlatformAdmin: true,
      });
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x' }, { type: 'pet' })
      );
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canDelete).toBe(true);
    });
  });

  describe('content creator', () => {
    it('grants permission to creator of generic content', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x', author_id: 'u1' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canDelete).toBe(true);
    });

    it('grants permission to creator via owner_id', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x', owner_id: 'u1' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(true);
    });

    it('grants permission to creator via user_id', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x', user_id: 'u1' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(true);
    });

    it('grants permission to creator via created_by', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x', created_by: 'u1' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(true);
    });
  });

  describe('pet type', () => {
    it('returns not-resolved for pet content (use usePetPermissions)', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'p1', owner_id: 'u1' }, { type: 'pet' })
      );
      expect(result.current.canEdit).toBe(false);
      expect(result.current.reason).toContain('petPermissions');
    });
  });

  describe('community types', () => {
    it('grants community_post delete to author but not edit', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'p1', author_id: 'u1' }, { type: 'community_post' })
      );
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canEdit).toBe(false);
    });

    it('grants forum thread edit/delete to author', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 't1', author_id: 'u1' }, { type: 'community_forum_thread' })
      );
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canDelete).toBe(true);
    });

    it('denies forum thread to non-author', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 't1', author_id: 'u2' }, { type: 'community_forum_thread' })
      );
      expect(result.current.canEdit).toBe(false);
      expect(result.current.canDelete).toBe(false);
    });

    it('grants community edit to community owner', () => {
      isCommunityOwner.mockReturnValue(true);
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'c1', owner_id: 'u1' }, { type: 'community' })
      );
      expect(result.current.canEdit).toBe(true);
    });

    it('grants community edit to member with permission', () => {
      hasCommunityPermission.mockReturnValue(true);
      const membership = { role: 'admin', permissions: ['feed'] };
      const { result } = renderHook(() =>
        useCanEditContent(
          { id: 'c1' },
          { type: 'community', membership }
        )
      );
      expect(result.current.canEdit).toBe(true);
    });

    it('denies community edit to non-member non-owner', () => {
      // Garantir mocks resetados
      isCommunityOwner.mockReturnValue(false);
      hasCommunityPermission.mockReturnValue(false);
      const { result } = renderHook(() =>
        useCanEditContent(
          { id: 'c1', owner_id: 'u2' },  // outro user é owner
          { type: 'community' }
          // sem membership
        )
      );
      expect(result.current.canEdit).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('denies generic content to non-creator', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x', author_id: 'u2' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(false);
    });

    it('handles missing author_id fields', () => {
      const { result } = renderHook(() =>
        useCanEditContent({ id: 'x' }, { type: 'generic' })
      );
      expect(result.current.canEdit).toBe(false);
    });
  });
});
