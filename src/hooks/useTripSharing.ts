import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTripInvite,
  deleteTripInvite,
  deleteTripMember,
} from '@/services/api-client';
import { getTripQueryKey } from '@/stores/trip-store';
import type { TripInvite, TripMember, TripSnapshotResponse } from '@/types/api';

export function useCreateTripInvite(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation<TripInvite, Error, { email: string; role: 'owner' | 'editor' }>({
    mutationFn: async (payload) => createTripInvite(tripId, payload),
    onSuccess: (invite) => {
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                pendingInvites: [
                  ...current.pendingInvites.filter((entry) => entry.inviteId !== invite.inviteId),
                  invite,
                ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
              }
            : current,
      );
    },
  });
}

export function useDeleteTripInvite(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (inviteId) => deleteTripInvite(tripId, inviteId),
    onSuccess: (_data, inviteId) => {
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                pendingInvites: current.pendingInvites.filter((entry) => entry.inviteId !== inviteId),
              }
            : current,
      );
    },
  });
}

export function useDeleteTripMember(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, TripMember>({
    mutationFn: async (member) => deleteTripMember(tripId, member.memberId),
    onSuccess: (_data, member) => {
      queryClient.setQueryData<TripSnapshotResponse | undefined>(
        getTripQueryKey(tripId),
        (current) =>
          current
            ? {
                ...current,
                members: current.members.filter((entry) => entry.memberId !== member.memberId),
              }
            : current,
      );
    },
  });
}
