import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createTrip, listTrips } from '@/services/api-client';
import type { TripListItem } from '@/types/api';
import { TripDashboardScreen } from './TripDashboardScreen';

export function TripDashboardRoute() {
  const navigate = useNavigate();
  const tripsQuery = useQuery<TripListItem[], Error>({
    queryKey: ['trips'],
    queryFn: listTrips,
  });

  const handleCreateTrip = useCallback(
    async (name: string, startDate: string, endDate: string, timezone: string) => {
      const created = await createTrip({ name, startDate, endDate, timezone });
      navigate(`/trip/${created.id}`);
    },
    [navigate],
  );

  const handleOpenTrip = useCallback(
    (tripId: string) => {
      navigate(`/trip/${tripId}`);
    },
    [navigate],
  );

  return (
    <TripDashboardScreen
      trips={tripsQuery.data ?? []}
      isLoadingTrips={tripsQuery.isLoading}
      tripsError={tripsQuery.error?.message ?? null}
      onCreateTrip={handleCreateTrip}
      onOpenTrip={handleOpenTrip}
    />
  );
}
