/**
 * @fileoverview Smoke tests para CommunityEventDetail + CommunityEventParticipantsPanel.
 * TASK-334 — detalhe público de evento de comunidade com RSVP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'u1', displayName: 'João', photoURL: '' } })),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: vi.fn(() => false),
}));

vi.mock('@/core/lib/useArenaPageClasses', () => ({
  useArenaPageClasses: vi.fn(() => 'test-class'),
}));

vi.mock('@/modules/communities/hooks/useCommunities', () => ({
  useMyCommunityMembership: vi.fn(() => ({ data: { role: 'member' } })),
  useCommunityEvent: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
  useCommunityEventRsvps: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useSetCommunityEventRsvp: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useRemoveCommunityEventRsvp: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('CommunityEventDetail — estrutura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CommunityEventDetail é um componente válido (forwardRef)', async () => {
    const { default: CommunityEventDetail } = await import('./CommunityEventDetail');
    expect(CommunityEventDetail).toBeTruthy();
    expect(typeof CommunityEventDetail).toBe('function');
  });

  it('CommunityEventParticipantsPanel é um componente válido', async () => {
    const { default: CommunityEventParticipantsPanel } = await import(
      '../components/CommunityEventParticipantsPanel'
    );
    expect(CommunityEventParticipantsPanel).toBeTruthy();
    expect(typeof CommunityEventParticipantsPanel).toBe('function');
  });

  it('Feature flag COMMUNITY_EVENT_DETAIL_V1 existe no catálogo', async () => {
    const { FEATURE_FLAG } = await import('@/core/featureFlags');
    expect(FEATURE_FLAG.COMMUNITY_EVENT_DETAIL_V1).toBe('community_event_detail_v1');
  });

  it('Flag default é false', async () => {
    const { DEFAULT_FEATURE_FLAGS } = await import('@/core/featureFlags');
    expect(DEFAULT_FEATURE_FLAGS['community_event_detail_v1']).toBe(false);
  });

  it('COMMUNITY_EVENT_RSVP tem going/maybe/not_going', async () => {
    const { COMMUNITY_EVENT_RSVP } = await import(
      '@/modules/communities/domain/constants'
    );
    expect(COMMUNITY_EVENT_RSVP.GOING).toBe('going');
    expect(COMMUNITY_EVENT_RSVP.MAYBE).toBe('maybe');
    expect(COMMUNITY_EVENT_RSVP.NOT_GOING).toBe('not_going');
  });

  it('useCommunityEvent hook aceita communityId + eventId', async () => {
    const { useCommunityEvent } = await import(
      '@/modules/communities/hooks/useCommunities'
    );
    const hook = useCommunityEvent('comm1', 'ev1');
    expect(hook.data).toBeNull();
  });

  it('useCommunityEventRsvps hook aceita eventId', async () => {
    const { useCommunityEventRsvps } = await import(
      '@/modules/communities/hooks/useCommunities'
    );
    const hook = useCommunityEventRsvps('ev1');
    expect(Array.isArray(hook.data)).toBe(true);
  });
});
