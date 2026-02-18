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
  const [showDestSearch, setShowDestSearch] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const routeCalculationRef = useRef<number>(0);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;

  useEffect(() => {
    setEditorValue(itemToEditorValue(item));
    setShowDestSearch(false);
  }, [item]);

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  // Calculate route when origin, destination, mode, or route type changes
  const calculateRoute = useCallback(async () => {
    if (!hasOrigin || !hasDest) return;
    if (editorValue.itemRouteType === 'straight') {
      // For straight lines, clear the route data (distance will be calculated on display)
      return;
    }

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
          updates.durationMinutes = result.durationMinutes;

          // Update endTime based on new duration if we have a start time
          if (editorValue.scheduledStart) {
            const [startHour, startMin] = editorValue.scheduledStart.split(':').map(Number);
            const startTotalMin = startHour * 60 + startMin;
            const endTotalMin = startTotalMin + result.durationMinutes;
            const endHour = Math.floor(endTotalMin / 60) % 24;
            const endMinute = endTotalMin % 60;
            updates.scheduledEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          }

          // Update local editor state too
          setEditorValue((prev) => ({
            ...prev,
            durationMinutes: result.durationMinutes,
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
  }, [hasOrigin, hasDest, item.lat, item.lng, item.destLat, item.destLng, editorValue.transportMode, editorValue.itemRouteType, editorValue.durationMinutes, editorValue.scheduledStart, commit]);

  // Trigger route calculation when relevant fields change
  useEffect(() => {
    if (hasOrigin && hasDest && editorValue.itemRouteType === 'directions') {
      // Debounce route calculation
      const timeoutId = setTimeout(() => {
        calculateRoute();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [hasOrigin, hasDest, editorValue.transportMode, editorValue.itemRouteType, calculateRoute]);

  const handleEditorChange = (next: EventEditorValue) => {
    setEditorValue(next);
    commit({
      type: next.type,
      transportMode: next.transportMode,
      itemRouteType: next.itemRouteType,
      scheduledStart: next.scheduledStart,
      scheduledEnd: next.scheduledEnd,
      durationMinutes: next.durationMinutes,
      notesMd: next.notesMd,
      availabilityWindows: next.availabilityWindows,
      timelineLocked: next.timelineLocked,
      // Refresh cached route whenever mode/type changes from inline editor.
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
    });
  };

  const handleDestSelect = async (place: PlaceSearchResult) => {
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

    // Calculate route if using directions mode and we have an origin
    if (hasOrigin && editorValue.itemRouteType === 'directions') {
      const requestId = ++routeCalculationRef.current;
      setIsCalculatingRoute(true);

      try {
        const result = await mapsRepository.calculateLeg(
          { lat: item.lat, lng: item.lng },
          { lat: place.lat, lng: place.lng },
          editorValue.transportMode,
        );

        if (requestId !== routeCalculationRef.current) return;

        if (result) {
          const updates: Partial<Item> = {
            itemRoutePathEncoded: result.routePathEncoded,
            itemRouteDistanceMeters: result.distanceMeters,
            itemRouteDurationMinutes: result.durationMinutes,
          };

          if (result.durationMinutes > 0) {
            updates.durationMinutes = result.durationMinutes;

            if (editorValue.scheduledStart) {
              const [startHour, startMin] = editorValue.scheduledStart.split(':').map(Number);
              const startTotalMin = startHour * 60 + startMin;
              const endTotalMin = startTotalMin + result.durationMinutes;
              const endHour = Math.floor(endTotalMin / 60) % 24;
              const endMinute = endTotalMin % 60;
              updates.scheduledEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            }

            setEditorValue((prev) => ({
              ...prev,
              durationMinutes: result.durationMinutes,
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
    }
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
        />
      </div>
    </div>
  );
}
