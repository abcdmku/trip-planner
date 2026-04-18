import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, X, Trash2 } from 'lucide-react';
import type { Item } from '../../types/trip';
import { PlaceSearch } from './PlaceSearch';
import { RouteTravelControls } from './RouteTravelControls';
import { mapsRepository, type PlaceSearchResult } from '../../services/maps-repository';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  dayDate?: string;
  density?: 'compact' | 'comfortable';
  onUpdate?: (updates: Partial<Item>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  embedded?: boolean;
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
  dayColor,
  dayDate,
  density = 'comfortable',
  onUpdate,
  onDelete,
  onClose,
  embedded = false,
}: ItemDetailCardProps) {
  const isCompact = density === 'compact';
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [originPlaceDetails, setOriginPlaceDetails] = useState<PlaceSearchResult | null>(null);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [pendingRouteDurationMinutes, setPendingRouteDurationMinutes] = useState(0);
  const routeCalculationRef = useRef(0);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;
  const showTravelControls = hasDest || editorValue.type === 'transport';
  const displayedRouteDurationMinutes =
    pendingRouteDurationMinutes > 0 ? pendingRouteDurationMinutes : item.itemRouteDurationMinutes;

  const openInGoogleMapsUrl = useMemo(() => {
    if (!hasOrigin || !hasDest) return undefined;
    return buildGoogleMapsDirectionsUrl({
      origin: { lat: item.lat, lng: item.lng },
      destination: { lat: item.destLat, lng: item.destLng },
      mode: editorValue.transportMode,
    });
  }, [editorValue.transportMode, hasDest, hasOrigin, item.destLat, item.destLng, item.lat, item.lng]);

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
    const duration = displayedRouteDurationMinutes > 0 ? `${displayedRouteDurationMinutes}m` : '';
    return `${modeLabel} / ${routeLabel}${duration ? ` / ${duration}` : ''}`;
  }, [displayedRouteDurationMinutes, editorValue.itemRouteType, editorValue.transportMode]);

  const hasCalculatedRoute = useMemo(() => {
    return Boolean(item.itemRoutePathEncoded) || item.itemRouteDistanceMeters > 0 || displayedRouteDurationMinutes > 0;
  }, [displayedRouteDurationMinutes, item.itemRouteDistanceMeters, item.itemRoutePathEncoded]);

  const routeSummary = useMemo(() => {
    const destinationLabel = hasDest ? item.destName || 'Destination set' : 'No destination';
    return showTravelControls ? `${destinationLabel} / ${travelBadge}` : destinationLabel;
  }, [hasDest, item.destName, showTravelControls, travelBadge]);

  useEffect(() => {
    setEditorValue(itemToEditorValue(item));
  }, [
    item.itemId,
    item.type,
    item.transportMode,
    item.itemRouteType,
    item.scheduledStart,
    item.scheduledEnd,
    item.durationMinutes,
    item.notesMd,
    item.availabilityWindows,
    item.timelineLocked,
  ]);

  useEffect(() => {
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    setPendingRouteDurationMinutes(0);
  }, [item.itemId]);

  useEffect(() => {
    if (pendingRouteDurationMinutes > 0 && item.itemRouteDurationMinutes === pendingRouteDurationMinutes) {
      setPendingRouteDurationMinutes(0);
    }
  }, [item.itemRouteDurationMinutes, pendingRouteDurationMinutes]);

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

      if (requestId !== routeCalculationRef.current) return;

      if (result) {
        setPendingRouteDurationMinutes(result.durationMinutes);

        const updates: Partial<Item> = {
          itemRoutePathEncoded: result.routePathEncoded,
          itemRouteDistanceMeters: result.distanceMeters,
          itemRouteDurationMinutes: result.durationMinutes,
        };

        if (result.durationMinutes > 0 && result.durationMinutes !== editorValue.durationMinutes) {
          let nextDuration = result.durationMinutes;

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
  }, [
    commit,
    editorValue.durationMinutes,
    editorValue.itemRouteType,
    editorValue.scheduledStart,
    editorValue.transportMode,
    hasDest,
    hasOrigin,
    item.destLat,
    item.destLng,
    item.lat,
    item.lng,
  ]);

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

    if (next.transportMode !== editorValue.transportMode || next.itemRouteType !== editorValue.itemRouteType) {
      updates.itemRoutePathEncoded = '';
      updates.itemRouteDistanceMeters = 0;
      updates.itemRouteDurationMinutes = 0;
      setPendingRouteDurationMinutes(0);
    }

    if (Object.keys(updates).length > 0) {
      commit(updates);
    }
  };

  const handleOriginSelect = (place: PlaceSearchResult) => {
    setPendingRouteDurationMinutes(0);
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
    setPendingRouteDurationMinutes(0);
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

  const clearDestination = () => {
    setPendingRouteDurationMinutes(0);
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
  };

  const outerClassName = embedded
    ? undefined
    : `animate-in rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg ${
        dayColor ? 'border-t-2' : ''
      }`;
  const outerStyle = !embedded && dayColor ? { borderTopColor: dayColor } : undefined;
  const stopRowClass = 'grid gap-2 md:grid-cols-[72px_minmax(0,1fr)] md:items-start';
  const stopLabelClass =
    'flex items-center gap-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-theme-tertiary';
  const stopSurfaceClass =
    'group/stop relative block w-full rounded-xl border border-transparent bg-theme px-3 py-2 text-left transition-colors hover:border-theme hover:bg-theme-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent),0.25)]';

  return (
    <div className={outerClassName} style={outerStyle}>
      <div className={isCompact ? 'p-2.5' : 'p-4'}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[15px] font-semibold text-theme">{item.placeName}</h4>
            {item.address ? (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-theme-tertiary">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            ) : null}
          </div>

          {(onDelete || onClose) ? (
            <div className="flex items-center gap-1">
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md p-1 text-theme-tertiary hover:bg-red-500/10 hover:text-red-500"
                  aria-label="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
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
          ) : null}
        </div>

        <section className="mt-2.5 border-t border-theme-subtle pt-2.5">
          <div>
            <div className="text-[13px] font-medium text-theme-secondary">Route</div>
            <p className="mt-1 truncate text-[11px] text-theme-tertiary">
              {isCalculatingRoute ? 'Updating travel time...' : routeSummary}
            </p>
          </div>

          <div className="mt-3 space-y-3">
            <div className={stopRowClass}>
              <div className={stopLabelClass}>
                <span
                  className="h-2.5 w-2.5 rounded-full bg-theme-tertiary/40"
                  style={dayColor ? { backgroundColor: dayColor } : undefined}
                />
                <span>Origin</span>
              </div>

              {isEditingOrigin ? (
                <div className="space-y-2">
                  <PlaceSearch autoFocus onSelect={handleOriginSelect} placeholder="Search origin..." />
                  <button
                    type="button"
                    onClick={() => setIsEditingOrigin(false)}
                    className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingOrigin(true)}
                  className={stopSurfaceClass}
                  aria-label="Edit origin"
                >
                  <p className="truncate text-[13px] font-semibold text-theme">{item.placeName}</p>
                  {item.address ? (
                    <p className="mt-0.5 truncate text-[11px] text-theme-tertiary">{item.address}</p>
                  ) : null}
                </button>
              )}
            </div>

            <div className="border-t border-theme-subtle pt-3">
              <div className={stopRowClass}>
                <div className={stopLabelClass}>
                  <Navigation className="h-3.5 w-3.5" style={dayColor ? { color: dayColor } : undefined} />
                  <span>Destination</span>
                </div>

                {isEditingDestination ? (
                  <div className="space-y-2">
                    <PlaceSearch autoFocus onSelect={handleDestSelect} placeholder="Search destination..." />
                    <button
                      type="button"
                      onClick={() => setIsEditingDestination(false)}
                      className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="group/stop relative">
                    <button
                      type="button"
                      onClick={() => setIsEditingDestination(true)}
                      className={`${stopSurfaceClass} ${hasDest ? 'pr-12' : ''}`}
                      aria-label={hasDest ? 'Edit destination' : 'Add destination'}
                    >
                      <p className="truncate text-[13px] font-semibold text-theme">
                        {hasDest ? item.destName || 'Destination' : 'Add destination'}
                      </p>
                      {hasDest && item.destAddress ? (
                        <p className="mt-0.5 truncate text-[11px] text-theme-tertiary">{item.destAddress}</p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-theme-tertiary">
                          Add one to estimate travel time and open the route in Maps.
                        </p>
                      )}
                    </button>

                    {hasDest ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearDestination();
                        }}
                        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-theme-tertiary opacity-0 transition-all hover:bg-theme hover:text-theme group-hover/stop:opacity-100 group-focus-within/stop:opacity-100"
                        aria-label="Clear destination"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {showTravelControls ? (
              <div className="border-t border-theme-subtle pt-3">
                <RouteTravelControls
                  transportMode={editorValue.transportMode}
                  itemRouteType={editorValue.itemRouteType}
                  onChange={(next) => handleEditorChange({ ...editorValue, ...next })}
                  compact={isCompact}
                  hasOrigin={hasOrigin}
                  hasDestination={hasDest}
                  openInGoogleMapsUrl={openInGoogleMapsUrl}
                  onCalculateRoute={doCalculateRoute}
                  isCalculatingRoute={isCalculatingRoute}
                  canCalculateRoute={hasOrigin && hasDest && editorValue.itemRouteType === 'directions'}
                  hasCalculatedRoute={hasCalculatedRoute}
                  travelDurationMinutes={displayedRouteDurationMinutes}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-2.5 border-t border-theme-subtle pt-2.5">
          <EventEditorForm
            key={item.itemId}
            value={editorValue}
            onChange={handleEditorChange}
            compact={isCompact}
            defaultDate={dayDate}
            mapsAvailabilityWindows={originPlaceDetails?.mapsAvailabilityWindows}
          />
        </section>
      </div>
    </div>
  );
}
