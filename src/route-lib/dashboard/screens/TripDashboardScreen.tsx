import { useState } from 'react';
import { Loader2, Plane } from 'lucide-react';
import { CreateTripDialog } from '@component-lib/trips/CreateTripDialog';
import { TripPlannerLogo } from '@component-lib/shared/TripPlannerLogo';
import type { TripListItem } from '@/types/api';

export interface TripDashboardScreenProps {
  trips: TripListItem[];
  isLoadingTrips: boolean;
  tripsError: string | null;
  onCreateTrip: (name: string, startDate: string, endDate: string, timezone: string) => void;
  onOpenTrip: (tripId: string) => void;
}

export function TripDashboardScreen({
  trips,
  isLoadingTrips,
  tripsError,
  onCreateTrip,
  onOpenTrip,
}: TripDashboardScreenProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="sr-only">Trip Planner</h1>
          <TripPlannerLogo
            variant="full"
            decorative
            className="mx-auto w-full max-w-[18rem] animate-fade-up"
          />
          <p className="mt-2 text-sm text-theme-secondary">
            Create a new trip or open an existing one
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-primary flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-semibold"
          >
            <Plane className="h-5 w-5" />
            Create New Trip
          </button>
        </div>

        <div className="rounded-2xl border border-theme bg-theme-elevated p-3 shadow-theme-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-theme">Your Trips ({trips.length})</h2>
            {isLoadingTrips ? <Loader2 className="h-4 w-4 animate-spin text-theme-secondary" /> : null}
          </div>

          {tripsError ? (
            <p className="text-xs text-theme-secondary">{tripsError}</p>
          ) : isLoadingTrips && trips.length === 0 ? (
            <p className="text-xs text-theme-secondary">Loading trips...</p>
          ) : trips.length === 0 ? (
            <p className="text-xs text-theme-secondary">
              No trips yet. Create your first trip to start planning.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onOpenTrip(trip.id)}
                  className="w-full rounded-xl border border-theme bg-theme px-3 py-2 text-left shadow-theme-sm transition-colors hover:bg-theme-subtle"
                >
                  <div className="truncate text-sm font-medium text-theme">{trip.name}</div>
                  <div className="mt-1 text-[11px] text-theme-secondary">
                    {trip.startDate} to {trip.endDate}
                  </div>
                  <div className="mt-1 text-[11px] text-theme-secondary">
                    {trip.role} · Updated {new Date(trip.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTripDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, startDate, endDate, timezone) => {
          setShowCreate(false);
          onCreateTrip(name, startDate, endDate, timezone);
        }}
      />
    </div>
  );
}
