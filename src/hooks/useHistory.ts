import { useMutation } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrip';
import type { HistoryEvent } from '@/types/trip';

export function useHistory(tripId: string | null | undefined) {
  const { history, isLoading, error } = useTrip(tripId);
  return { history, isLoading, error };
}

export function useAppendHistory(_tripId: string) {
  return useMutation<void, Error, HistoryEvent[]>({
    mutationFn: async () => {
      throw new Error('History is recorded automatically by the server.');
    },
  });
}
