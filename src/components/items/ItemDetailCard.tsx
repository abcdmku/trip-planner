import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, X, Loader2, PencilLine, ChevronDown } from 'lucide-react';
import type { Item } from '../../types/trip';
import { PlaceSearch } from './PlaceSearch';
import { RouteTravelControls } from './RouteTravelControls';
import { mapsRepository, type PlaceSearchResult } from '../../services/maps-repository';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  dayDate?: string;
  density?: 'compact' | 'comfortable';
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
  density = 'comfortable',
  onUpdate,
  onClose,
}: ItemDetailCardProps) {
  const isCompact = density === 'compact';
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [originPlaceDetails, setOriginPlaceDetails] = useState<PlaceSearchResult | null>(null);
  const [isRouteOpen, setIsRouteOpen] = useState(false);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const routeCalculationRef = useRef<number>(0);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;
  const showTravelControls = hasDest || editorValue.type === 'transport';
  const travelBadge = useMemo(() => {
    const modeLabel =
      editorValue.transportMode === 'driving'
        ? 'Drive'
        : editorValue.transportMode === 'walking'
          ? 'Walk'
          : editorValue.transportMode === 'bicycling'
            ? 'Bike'
            : editorValue.transportMode === 'transit'
              ? 'Transit'
              : editorValue.transportMode === 'flight'
                ? 'Flight'
                : 'Other';
    const routeLabel = editorValue.itemRouteType === 'directions' ? 'Routed' : 'Straight';
    const duration = item.itemRouteDurationMinutes > 0 ? `${item.itemRouteDurationMinutes}m` : '';
    return `${modeLabel} \u00b7 ${routeLabel}${duration ? ` \u00b7 ${duration}` : ''}`;
  }, [editorValue.itemRouteType, editorValue.transportMode, item.itemRouteDurationMinutes]);
  const hasCalculatedRoute = useMemo(() => {
    return Boolean(item.itemRoutePathEncoded) || item.itemRouteDistanceMeters > 0 || item.itemRouteDurationMinutes > 0;
  }, [item.itemRouteDistanceMeters, item.itemRouteDurationMinutes, item.itemRoutePathEncoded]);

  useEffect(() => {
    setEditorValue(itemToEditorValue(item));
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    setIsRouteOpen(false);
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

  const handleOriginSelect = (place: PlaceSearchResult) => {
    commit({
      placeId: place.placeId,
      placeName: place.name,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
    });
    setIsEditingOrigin(false);
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
    setIsEditingDestination(false);
  };

  return (
    <div className="animate-in rounded-xl border border-theme bg-theme-elevated shadow-theme-md">
      <div className="h-0.5 rounded-t-xl" style={{ backgroundColor: dayColor }} />

      <div className={isCompact ? 'p-2.5' : 'p-3'}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-theme">{item.placeName}</h4>
            {item.address ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-theme-tertiary">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            ) : null}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-theme bg-theme-subtle">
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard handled via onKeyDown */}
          <div
            onClick={() => {
              if (isRouteOpen) {
                setIsEditingOrigin(false);
                setIsEditingDestination(false);
              }
              setIsRouteOpen(!isRouteOpen);
            }}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-[rgba(var(--color-bg-elevated),0.6)]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isRouteOpen) {
                  setIsEditingOrigin(false);
                  setIsEditingDestination(false);
                }
                setIsRouteOpen(!isRouteOpen);
              }
            }}
          >
            <span className="text-[13px] font-medium text-theme-secondary">Route</span>
            <span className="flex-1" />
            {isCalculatingRoute ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculating...
              </span>
            ) : (
              <span className="max-w-[55%] truncate text-[11px] text-theme-tertiary">
                {showTravelControls ? travelBadge : hasDest ? 'Origin to destination' : 'Destination is optional'}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-theme-tertiary transition-transform ${
                isRouteOpen ? '' : '-rotate-90'
              }`}
            />
          </div>

          <div className="border-t border-theme-subtle p-3">
            {isRouteOpen ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: dayColor }}
                      />
                    </span>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-theme-tertiary">
                      Origin
                    </label>
                  </div>

                  {isEditingOrigin ? (
                    <div className="space-y-1.5">
                      <PlaceSearch onSelect={handleOriginSelect} placeholder="Search origin..." />
                      <button
                        type="button"
                        onClick={() => setIsEditingOrigin(false)}
                        className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-theme bg-theme-elevated px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-theme">{item.placeName}</p>
                        {item.address ? (
                          <p className="truncate text-[10px] text-theme-tertiary">{item.address}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingOrigin(true)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                        aria-label="Change origin"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        <span className={isCompact ? 'hidden sm:inline' : ''}>Change</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Navigation className="h-4 w-4" style={{ color: dayColor }} />
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-theme-tertiary">
                      Destination (optional)
                    </label>
                  </div>

                  {hasDest && !isEditingDestination ? (
                    <div className="rounded-lg border border-theme bg-theme-elevated">
                      <div className="flex items-start gap-2 px-2.5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-theme">
                            {item.destName || 'Destination'}
                          </p>
                          {item.destAddress ? (
                            <p className="truncate text-[10px] text-theme-tertiary">{item.destAddress}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setIsEditingDestination(true)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              commit({
                                destLat: 0,
                                destLng: 0,
                                destName: '',
                                destAddress: '',
                                itemRoutePathEncoded: '',
                                itemRouteDistanceMeters: 0,
                                itemRouteDurationMinutes: 0,
                              });
                              setIsEditingDestination(false);
                            }}
                            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                            aria-label="Clear destination"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {showTravelControls ? (
                        <div className="border-t border-theme-subtle px-2.5 py-2">
                          <RouteTravelControls
                            transportMode={editorValue.transportMode}
                            itemRouteType={editorValue.itemRouteType}
                            onChange={(next) => handleEditorChange({ ...editorValue, ...next })}
                            compact={isCompact}
                            hasOrigin={hasOrigin}
                            hasDestination={hasDest}
                            onCalculateRoute={doCalculateRoute}
                            isCalculatingRoute={isCalculatingRoute}
                            canCalculateRoute={hasOrigin && hasDest && editorValue.itemRouteType === 'directions'}
                            hasCalculatedRoute={hasCalculatedRoute}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <PlaceSearch onSelect={handleDestSelect} placeholder="Search destination..." />
                        {hasDest ? (
                          <button
                            type="button"
                            onClick={() => setIsEditingDestination(false)}
                            className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>

                      {showTravelControls ? (
                        <div className="rounded-lg border border-theme bg-theme-elevated px-2.5 py-2">
                          <RouteTravelControls
                            transportMode={editorValue.transportMode}
                            itemRouteType={editorValue.itemRouteType}
                            onChange={(next) => handleEditorChange({ ...editorValue, ...next })}
                            compact={isCompact}
                            hasOrigin={hasOrigin}
                            hasDestination={hasDest}
                            onCalculateRoute={doCalculateRoute}
                            isCalculatingRoute={isCalculatingRoute}
                            canCalculateRoute={hasOrigin && hasDest && editorValue.itemRouteType === 'directions'}
                            hasCalculatedRoute={hasCalculatedRoute}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: dayColor }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-theme">{item.placeName || 'Origin'}</p>
                    {item.address ? (
                      <p className="truncate text-[10px] text-theme-tertiary">{item.address}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Navigation
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: dayColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-theme">
                      {hasDest ? item.destName || 'Destination' : 'No destination'}
                    </p>
                    {hasDest && item.destAddress ? (
                      <p className="truncate text-[10px] text-theme-tertiary">{item.destAddress}</p>
                    ) : !hasDest ? (
                      <p className="truncate text-[10px] text-theme-tertiary">
                        Add one to plan travel time.
                      </p>
                    ) : null}
                  </div>
                  {showTravelControls ? (
                    <span className="shrink-0 text-[11px] font-medium text-theme-tertiary">
                      {travelBadge}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={isCompact ? 'mt-3' : 'mt-4'}>
          <EventEditorForm
            value={editorValue}
            onChange={handleEditorChange}
            compact={isCompact}
            defaultDate={dayDate}
            mapsAvailabilityWindows={originPlaceDetails?.mapsAvailabilityWindows}
          />
        </div>
      </div>
    </div>
  );
}
