import { useState, useCallback } from 'react';
import { Home, X, ChevronDown, ChevronUp } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { Trip } from '@/types/trip';

interface TripEndpointRowProps {
  trip: Trip;
  onUpdate: (updates: Partial<Trip>) => void;
}

export function TripEndpointRow({ trip, onUpdate }: TripEndpointRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasStart = trip.startLat !== 0 || trip.startLng !== 0;

  const handleSelect = useCallback(
    (place: PlaceSearchResult) => {
      onUpdate({
        startLat: place.lat,
        startLng: place.lng,
        startName: place.name,
        startAddress: place.address,
      });
      setIsExpanded(false);
    },
    [onUpdate],
  );

  const handleClear = useCallback(() => {
    onUpdate({
      startLat: 0,
      startLng: 0,
      startName: '',
      startAddress: '',
    });
  }, [onUpdate]);

  return (
    <div className="rounded-xl border border-dashed border-theme bg-theme-elevated">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-theme-subtle"
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ backgroundColor: hasStart ? '#10b981' : undefined }}
        >
          <Home
            className={`h-3.5 w-3.5 ${hasStart ? 'text-white' : 'text-theme-tertiary'}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          {hasStart ? (
            <>
              <p className="truncate text-xs font-medium text-theme">
                {trip.startName || 'Start Location'}
              </p>
              {trip.startAddress && (
                <p className="truncate text-[10px] text-theme-tertiary">
                  {trip.startAddress}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-theme-tertiary">Set start location...</p>
          )}
        </div>
        {hasStart && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
            aria-label="Clear start location"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-theme-tertiary" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-theme-tertiary" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-theme px-3 py-2 pb-4">
          <PlaceSearch
            onSelect={handleSelect}
            placeholder="Search for start location..."
          />
        </div>
      )}
    </div>
  );
}
