import { useCallback, useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, X, Loader2 } from 'lucide-react';
import type { Item } from '../../types/trip';
import { PlaceSearch } from './PlaceSearch';
import { mapsRepository, type PlaceSearchResult } from '../../services/maps-repository';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  dayDate?: string;
  onUpdate?: (updates: Partial<Item>) => void;
  onClose?: () => void;
}

function itemToEditorValue(item: Item): EventEditorValue {
  return {
    type: item.type,
    transportMode: item.transportMode,
    itemRouteType: item.itemRouteType,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    durationMinutes: item.durationMinutes,
    notesMd: item.notesMd,
    availabilityWindows: item.availabilityWindows,
    timelineLocked: item.timelineLocked,
  };
}

export function ItemDetailCard({
  item,
  dayColor = '#3B82F6',
  dayDate,
  onUpdate,
  onClose,
}: ItemDetailCardProps) {
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [originPlaceDetails, setOriginPlaceDetails] = useState<PlaceSearchResult | null>(null);
  const [showDestSearch, setShowDestSearch] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const routeCalculationRef = useRef<number>(0);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;

  useEffect(() => {
    setEditorValue(itemToEditorValue(item));
    setShowDestSearch(false);
  }, [item.itemId]);

  useEffect(() => {
    let cancelled = false;

    if (!item.placeId || item.placeId.startsWith('custom-')) {
      setOriginPlaceDetails(null);
      return () => {
        cancelled = true;
      };
    }

    setOriginPlaceDetails(null);
    mapsRepository
      .getPlaceDetails(item.placeId)
      .then((place) => {
        if (!cancelled) setOriginPlaceDetails(place);
      })
      .catch(() => {
        if (!cancelled) setOriginPlaceDetails(null);
      });

    return () => {
      cancelled = true;
    };
  }, [item.placeId]);

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  // Core route calculation logic — calls Google Directions API
  const doCalculateRoute = useCallback(async () => {
    if (!hasOrigin || !hasDest || editorValue.itemRouteType !== 'directions') return;

    const requestId = ++routeCalculationRef.current;
    setIsCalculatingRoute(true);

    try {
      const result = await mapsRepository.calculateLeg(
        { lat: item.lat, lng: item.lng },
        { lat: item.destLat, lng: item.destLng },
        editorValue.transportMode,
      );

      // Check if this is still the latest request
      if (requestId !== routeCalculationRef.current) return;

      if (result) {
        // Update item with calculated route data and duration
        // Duration and endTime are bound - update duration which affects endTime
        const updates: Partial<Item> = {
          itemRoutePathEncoded: result.routePathEncoded,
          itemRouteDistanceMeters: result.distanceMeters,
          itemRouteDurationMinutes: result.durationMinutes,
        };

        // Also update the duration if it's different
        if (result.durationMinutes > 0 && result.durationMinutes !== editorValue.durationMinutes) {
          let nextDuration = result.durationMinutes;

          // Update endTime based on new duration if we have a start time
          if (editorValue.scheduledStart) {
            const [startHour, startMin] = editorValue.scheduledStart.split(':').map(Number);
            const startTotalMin = startHour * 60 + startMin;
            const maxDuration = Math.max(0, 23 * 60 + 59 - startTotalMin);
            nextDuration = Math.min(nextDuration, maxDuration);
            const endTotalMin = startTotalMin + nextDuration;
            const endHour = Math.floor(endTotalMin / 60);
            const endMinute = endTotalMin % 60;
            updates.scheduledEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          }

          updates.durationMinutes = nextDuration;

          // Update local editor state too
          setEditorValue((prev) => ({
            ...prev,
            durationMinutes: nextDuration,
            scheduledEnd: updates.scheduledEnd ?? prev.scheduledEnd,
          }));
        }

        commit(updates);
      }
    } catch (error) {
      console.error('Failed to calculate route:', error);
    } finally {
      if (requestId === routeCalculationRef.current) {
        setIsCalculatingRoute(false);
      }
    }
  }, [hasOrigin, hasDest, item.lat, item.lng, item.destLat, item.destLng, editorValue.itemRouteType, editorValue.transportMode, editorValue.durationMinutes, editorValue.scheduledStart, commit]);

  const handleEditorChange = (next: EventEditorValue) => {
    setEditorValue(next);
    const updates: Partial<Item> = {};
    if (next.type !== editorValue.type) updates.type = next.type;
    if (next.transportMode !== editorValue.transportMode) updates.transportMode = next.transportMode;
    if (next.itemRouteType !== editorValue.itemRouteType) updates.itemRouteType = next.itemRouteType;
    if (next.scheduledStart !== editorValue.scheduledStart) updates.scheduledStart = next.scheduledStart;
    if (next.scheduledEnd !== editorValue.scheduledEnd) updates.scheduledEnd = next.scheduledEnd;
    if (next.durationMinutes !== editorValue.durationMinutes) updates.durationMinutes = next.durationMinutes;
    if (next.notesMd !== editorValue.notesMd) updates.notesMd = next.notesMd;
    if (next.availabilityWindows !== editorValue.availabilityWindows) {
      updates.availabilityWindows = next.availabilityWindows;
    }
    if (next.timelineLocked !== editorValue.timelineLocked) updates.timelineLocked = next.timelineLocked;

    // Mode/route-style changes invalidate cached directions payloads.
    if (
      next.transportMode !== editorValue.transportMode ||
      next.itemRouteType !== editorValue.itemRouteType
    ) {
      updates.itemRoutePathEncoded = '';
      updates.itemRouteDistanceMeters = 0;
      updates.itemRouteDurationMinutes = 0;
    }

    if (Object.keys(updates).length > 0) {
      commit(updates);
    }
  };

  const handleDestSelect = (place: PlaceSearchResult) => {
    // Clear existing route data and set destination
    commit({
      destLat: place.lat,
      destLng: place.lng,
      destName: place.name,
      destAddress: place.address,
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
    });
    setShowDestSearch(false);
  };

  return (
    <div className="animate-in overflow-hidden rounded-xl border border-theme bg-theme-elevated shadow-theme-md">
      <div className="h-1" style={{ backgroundColor: dayColor }} />

      <div className="px-3 py-2">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center pt-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dayColor }} />
            {(hasDest || showDestSearch) ? (
              <>
                <div className="w-px min-h-[12px] flex-1" style={{ backgroundColor: `${dayColor}40` }} />
                <Navigation className="h-3 w-3" style={{ color: dayColor }} />
              </>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-theme">{item.placeName}</h4>
            {item.address ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-theme-tertiary">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            ) : null}

            {hasDest ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-theme-subtle px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-theme">{item.destName}</p>
                  {item.destAddress ? (
                    <p className="truncate text-[10px] text-theme-tertiary">{item.destAddress}</p>
                  ) : null}
                  {isCalculatingRoute && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-accent">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Calculating route...
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    commit({
                      destLat: 0,
                      destLng: 0,
                      destName: '',
                      destAddress: '',
                      itemRoutePathEncoded: '',
                      itemRouteDistanceMeters: 0,
                      itemRouteDurationMinutes: 0,
                    })
                  }
                  className="rounded p-0.5 text-theme-tertiary hover:text-theme"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : showDestSearch ? (
              <div className="mt-2 space-y-1">
                <PlaceSearch onSelect={handleDestSelect} placeholder="Search destination..." />
                <button
                  type="button"
                  onClick={() => setShowDestSearch(false)}
                  className="text-[10px] text-theme-tertiary hover:text-theme"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDestSearch(true)}
                className="mt-1 text-[10px] text-theme-tertiary hover:text-theme"
              >
                + Add destination
              </button>
            )}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-3 pb-3">
        <EventEditorForm
          value={editorValue}
          onChange={handleEditorChange}
          compact
          defaultDate={dayDate}
          onCalculateRoute={doCalculateRoute}
          isCalculatingRoute={isCalculatingRoute}
          canCalculateRoute={hasOrigin && hasDest && editorValue.itemRouteType === 'directions'}
          showTransportation={hasDest || editorValue.type === 'transport'}
          mapsAvailabilityWindows={originPlaceDetails?.mapsAvailabilityWindows}
        />
      </div>
    </div>
  );
}
