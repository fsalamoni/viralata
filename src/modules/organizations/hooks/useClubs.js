import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';
import {
  createClub,
  getClub,
  listClubs,
  listMyClubs,
  updateClub,
  deleteClub,
  regenerateInviteCode,
  listClubMembers,
  getMembership,
  joinClubByCode,
  leaveClub,
  setMemberRole,
  setMemberPermissions,
  removeMember,
  updateMemberProfile,
  requestToJoinClub,
  getMyJoinRequest,
  listMyJoinRequests,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  inviteMemberToClub,
  inviteMembersToClub,
  cancelClubInvite,
  listClubInvites,
  listMyClubInvites,
  getMyClubInvite,
  acceptClubInvite,
  declineClubInvite,
  listClubEvents,
  getClubEvent,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  listEventRsvps,
  setEventRsvp,
  listEventInvites,
  listMyEventInvites,
  listAvailableEvents,
  inviteToEvent,
  setMyEventResponse,
  removeEventInvite,
  listEventDates,
  addEventDate,
  updateEventDate,
  deleteEventDate,
  listEventDateRsvps,
  setEventDateRsvp,
  listEventMessages,
  sendEventMessage,
  updateEventMessage,
  deleteEventMessage,
  listEventParticipants,
  addEventParticipant,
  removeEventParticipant,
  listClubPosts,
  createClubPost,
  deleteClubPost,
  listClubCampaigns,
  createClubCampaign,
  updateClubCampaign,
  addCampaignFunds,
  deleteClubCampaign,
  listClubLedger,
  createLedgerEntry,
  deleteLedgerEntry,
} from '../services/clubService';

/* --------------------------------- Clubs -------------------------------- */

export function useClubs() {
  return useQuery({ queryKey: ['clubs'], queryFn: listClubs });
}

export function useMyClubs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-clubs', user?.uid],
    queryFn: () => (user?.uid ? listMyClubs(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

export function useClub(id) {
  return useQuery({ queryKey: ['club', id], queryFn: () => getClub(id), enabled: !!id });
}

export function useMyMembership(clubId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['club-membership', clubId, user?.uid],
    queryFn: () => getMembership(clubId, user?.uid),
    enabled: !!clubId && !!user?.uid,
  });
}

export function useCreateClub() {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createClub(user, userProfile, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}

export function useUpdateClub(id) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => updateClub(id, updates, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club', id] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}

export function useRegenerateInviteCode(id) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateInviteCode(id, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club', id] }),
  });
}

export function useDeleteClub(id) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteClub(id, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}

/* -------------------------------- Members ------------------------------- */

export function useClubMembers(clubId) {
  return useQuery({
    queryKey: ['club-members', clubId],
    queryFn: () => listClubMembers(clubId),
    enabled: !!clubId,
  });
}

export function useJoinClub() {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => joinClubByCode(code, user, userProfile),
    onSuccess: (club) => {
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      if (club?.id) {
        qc.invalidateQueries({ queryKey: ['club-members', club.id] });
        qc.invalidateQueries({ queryKey: ['club-membership', club.id] });
      }
    },
  });
}

export function useLeaveClub(clubId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => leaveClub(clubId, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
      qc.invalidateQueries({ queryKey: ['club-members', clubId] });
      qc.invalidateQueries({ queryKey: ['club-membership', clubId] });
    },
  });
}

export function useSetMemberRole(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ member, role }) => setMemberRole(clubId, member, role, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-members', clubId] }),
  });
}

export function useSetMemberPermissions(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ member, permissions }) => setMemberPermissions(clubId, member, permissions, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-members', clubId] }),
  });
}

export function useRemoveMember(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (member) => removeMember(clubId, member, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-members', clubId] }),
  });
}

export function useUpdateMemberProfile(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ member, input }) => updateMemberProfile(clubId, member, input, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-members', clubId] });
      qc.invalidateQueries({ queryKey: ['club-membership', clubId] });
    },
  });
}

/* ------------------ Join requests & membership invites ------------------ */

export function useMyJoinRequest(clubId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['club-join-request', clubId, user?.uid],
    queryFn: () => getMyJoinRequest(clubId, user?.uid),
    enabled: !!clubId && !!user?.uid,
  });
}

export function useMyJoinRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-club-join-requests', user?.uid],
    queryFn: () => (user?.uid ? listMyJoinRequests(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

export function useRequestToJoinClub() {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (club) => requestToJoinClub(club, user, userProfile),
    onSuccess: (_res, club) => {
      qc.invalidateQueries({ queryKey: ['club-join-request', club?.id] });
      qc.invalidateQueries({ queryKey: ['my-club-join-requests'] });
      if (club?.id) qc.invalidateQueries({ queryKey: ['club-membership', club.id] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}

export function useJoinRequests(clubId) {
  return useQuery({
    queryKey: ['club-join-requests', clubId],
    queryFn: () => listJoinRequests(clubId),
    enabled: !!clubId,
  });
}

export function useApproveJoinRequest(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request) => approveJoinRequest(request, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-join-requests', clubId] });
      qc.invalidateQueries({ queryKey: ['club-members', clubId] });
      qc.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
}

export function useRejectJoinRequest(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request) => rejectJoinRequest(request, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-join-requests', clubId] }),
  });
}

export function useInviteMemberToClub(club) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target) => inviteMemberToClub(club, target, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-invites', club?.id] }),
  });
}

/** Convite em lote (vários usuários selecionados de uma vez). */
export function useInviteMembersToClub(club) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targets) => inviteMembersToClub(club, targets, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-invites', club?.id] }),
  });
}

export function useCancelClubInvite(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite) => cancelClubInvite(invite, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-invites', clubId] }),
  });
}

export function useClubInvites(clubId) {
  return useQuery({
    queryKey: ['club-invites', clubId],
    queryFn: () => listClubInvites(clubId),
    enabled: !!clubId,
  });
}

export function useMyClubInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-club-invites', user?.uid],
    queryFn: () => (user?.uid ? listMyClubInvites(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

export function useMyClubInvite(clubId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['club-invite', clubId, user?.uid],
    queryFn: () => getMyClubInvite(clubId, user?.uid),
    enabled: !!clubId && !!user?.uid,
  });
}

export function useAcceptClubInvite(clubId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite) => acceptClubInvite(invite, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-invite', clubId] });
      qc.invalidateQueries({ queryKey: ['my-club-invites'] });
      qc.invalidateQueries({ queryKey: ['club-membership', clubId] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
      qc.invalidateQueries({ queryKey: ['club-members', clubId] });
    },
  });
}

export function useDeclineClubInvite(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite) => declineClubInvite(invite, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-invite', clubId] });
      qc.invalidateQueries({ queryKey: ['my-club-invites'] });
    },
  });
}

/* -------------------------------- Events -------------------------------- */

export function useClubEvents(clubId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['club-events', clubId, user?.uid],
    queryFn: () => listClubEvents(clubId, user?.uid),
    enabled: !!clubId,
  });
}

/* -------------------- Event invites / participants ---------------------- */

export function useEventInvites(eventId) {
  return useQuery({
    queryKey: ['event-invites', eventId],
    queryFn: () => listEventInvites(eventId),
    enabled: !!eventId,
  });
}

export function useMyEventInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-event-invites', user?.uid],
    queryFn: () => (user?.uid ? listMyEventInvites(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

/** Eventos disponíveis para o início (públicos dos meus clubes + convites). */
export function useAvailableEvents() {
  const { user } = useAuth();
  const { data: myClubs = [] } = useMyClubs();
  const clubIds = myClubs.map((c) => c.id).filter(Boolean);
  return useQuery({
    queryKey: ['available-events', user?.uid, clubIds.slice().sort().join(',')],
    queryFn: () => listAvailableEvents(user?.uid, clubIds),
    enabled: !!user?.uid,
  });
}

export function useInviteToEvent(event) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target) => inviteToEvent(event, target, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-invites', event.id] }),
  });
}

export function useSetEventResponse(event) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status) => setMyEventResponse(event, status, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-invites', event.id] });
      qc.invalidateQueries({ queryKey: ['my-event-invites'] });
    },
  });
}

export function useRemoveEventInvite(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => removeEventInvite(eventId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-invites', eventId] }),
  });
}

export function useCreateClubEvent(clubId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createClubEvent(clubId, { ...data, created_by_name: userProfile?.platform_name }, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-events', clubId] }),
  });
}

export function useUpdateClubEvent(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, updates }) => updateClubEvent(eventId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-events', clubId] }),
  });
}

export function useDeleteClubEvent(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId) => deleteClubEvent(eventId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-events', clubId] }),
  });
}

export function useEventRsvps(eventId) {
  return useQuery({
    queryKey: ['club-event-rsvps', eventId],
    queryFn: () => listEventRsvps(eventId),
    enabled: !!eventId,
  });
}

export function useSetEventRsvp(eventId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ event, status }) => setEventRsvp(event, status, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-event-rsvps', eventId] }),
  });
}

export function useClubEvent(eventId) {
  return useQuery({
    queryKey: ['club-event', eventId],
    queryFn: () => getClubEvent(eventId),
    enabled: !!eventId,
  });
}

export function useUpdateEvent(eventId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) => updateClubEvent(eventId, updates, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-event', eventId] });
      qc.invalidateQueries({ queryKey: ['club-events'] });
    },
  });
}

/* ----------------------------- Event dates ------------------------------ */

export function useEventDates(eventId) {
  return useQuery({
    queryKey: ['event-dates', eventId],
    queryFn: () => listEventDates(eventId),
    enabled: !!eventId,
  });
}

export function useAddEventDate(eventId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => addEventDate(eventId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-dates', eventId] }),
  });
}

export function useUpdateEventDate(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateId, updates }) => updateEventDate(eventId, dateId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-dates', eventId] }),
  });
}

export function useDeleteEventDate(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dateId) => deleteEventDate(eventId, dateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-dates', eventId] });
      qc.invalidateQueries({ queryKey: ['event-date-rsvps', eventId] });
    },
  });
}

export function useEventDateRsvps(eventId) {
  return useQuery({
    queryKey: ['event-date-rsvps', eventId],
    queryFn: () => listEventDateRsvps(eventId),
    enabled: !!eventId,
  });
}

export function useSetEventDateRsvp(eventId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateId, status }) => setEventDateRsvp(eventId, dateId, status, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-date-rsvps', eventId] }),
  });
}

/* ------------------------------ Event chat ------------------------------ */

export function useEventMessages(eventId) {
  return useQuery({
    queryKey: ['event-messages', eventId],
    queryFn: () => listEventMessages(eventId),
    enabled: !!eventId,
    refetchInterval: 15000,
  });
}

export function useSendEventMessage(eventId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => sendEventMessage(eventId, text, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-messages', eventId] }),
  });
}

export function useUpdateEventMessage(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }) => updateEventMessage(eventId, messageId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-messages', eventId] }),
  });
}

export function useDeleteEventMessage(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => deleteEventMessage(eventId, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-messages', eventId] }),
  });
}

/* ------------------------------ Participants ----------------------------- */

export function useEventParticipants(eventId) {
  return useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: () => listEventParticipants(eventId),
    enabled: !!eventId,
  });
}

export function useAddEventParticipant(eventId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => addEventParticipant(eventId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-participants', eventId] }),
  });
}

export function useRemoveEventParticipant(eventId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId) => removeEventParticipant(eventId, participantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event-participants', eventId] }),
  });
}

/* --------------------------------- Posts -------------------------------- */

export function useClubPosts(clubId) {
  return useQuery({
    queryKey: ['club-posts', clubId],
    queryFn: () => listClubPosts(clubId),
    enabled: !!clubId,
  });
}

export function useCreateClubPost(clubId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => createClubPost(clubId, input, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] }),
  });
}

export function useDeleteClubPost(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => deleteClubPost(postId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] }),
  });
}

/* ---------------------- Chamados de doação (campanhas) ------------------- */

export function useClubCampaigns(clubId) {
  return useQuery({
    queryKey: ['club-campaigns', clubId],
    queryFn: () => listClubCampaigns(clubId),
    enabled: !!clubId,
  });
}

export function useCreateClubCampaign(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createClubCampaign(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-campaigns', clubId] }),
  });
}

export function useUpdateClubCampaign(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, updates }) => updateClubCampaign(campaignId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-campaigns', clubId] }),
  });
}

export function useAddCampaignFunds(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, amount }) => addCampaignFunds(campaignId, amount, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-campaigns', clubId] }),
  });
}

export function useDeleteClubCampaign(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId) => deleteClubCampaign(campaignId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-campaigns', clubId] }),
  });
}

/* --------------------- Prestação de contas (financeiro) ------------------ */

export function useClubLedger(clubId) {
  return useQuery({
    queryKey: ['club-ledger', clubId],
    queryFn: () => listClubLedger(clubId),
    enabled: !!clubId,
  });
}

export function useCreateLedgerEntry(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createLedgerEntry(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-ledger', clubId] }),
  });
}

export function useDeleteLedgerEntry(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => deleteLedgerEntry(entryId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-ledger', clubId] }),
  });
}

/* --------------------- ICS / Calendar export (TASK-344) -------------------- */

/**
 * Gera e baixa o arquivo .ics de um evento.
 * @returns {UseMutationResult<{ics:string, filename:string}, Error, {eventId:string, appUrl?:string}>}
 */
export function useDownloadEventIcs() {
  return useMutation({
    mutationFn: async ({ eventId, appUrl }) => {
      if (!functions) throw new Error('Firebase Functions não inicializado.');
      const fn = httpsCallable(functions, 'generateEventIcs');
      const result = await fn({ eventId, appUrl: appUrl || window.location.origin });
      return result.data;
    },
  });
}
