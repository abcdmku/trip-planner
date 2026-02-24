import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Plus, Navigation, Loader2, ChevronDown } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import { RouteTravelControls } from './RouteTravelControls';
import { mapsRepository, type PlaceSearchResult } from '../../services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '../../types/trip';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';
import { hasAvailabilityConstraints, serializeAvailabilityWindows } from '@/lib/availability';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    placeId: string;
    placeName: string;
    lat: number;
    lng: number;
    address: string;
    type: ItemType;
    durationMinutes: number;
    notesMd: string;
    scheduledStart: string;
    scheduledEnd: string;
    destLat: number;
    destLng: number;
    destName: string;
    destAddress: string;
    transportMode: TransportMode;
    itemRouteType: RouteType;
    itemRoutePathEncoded?: string;
    itemRouteDistanceMeters?: number;
    itemRouteDurationMinutes?: number;
    availabilityWindows: string;
    timelineLocked: boolean;
    travelFromItemId?: string;
    travelToItemId?: string;
  }) => void;
  isSubmitting?: boolean;
  initialPlace?: PlaceSearchResult | null;
  initialDestination?: PlaceSearchResult | null;
  initialLocation?: { lat: number; lng: number } | null;
  initialStartTime?: string;
  initialEndTime?: string;
  initialType?: ItemType;
  initialTransportMode?: TransportMode;
  initialRouteType?: RouteType;
  initialAvailabilityWindows?: string;
  initialTimelineLocked?: boolean;
  initialTravelFromItemId?: string;
  initialTravelToItemId?: string;
  defaultDate?: string;
}

function inferItemType(googleTypes: string[]): ItemType {
  const s = new Set(googleTypes);
  if (s.has('lodging') || s.has('hotel') || s.has('motel') || s.has('resort_hotel')) return 'hotel';
  if (s.has('restaurant') || s.has('food') || s.has('cafe') || s.has('bar')) return 'restaurant';
  if (s.has('airport') || s.has('train_station') || s.has('transit_station') || s.has('bus_station')) return 'transport';
  if (s.has('museum') || s.has('art_gallery') || s.has('tourist_attraction') || s.has('park')) return 'attraction';
  if (s.has('gym') || s.has('spa') || s.has('stadium') || s.has('amusement_park')) return 'activity';
  return 'other';
}

function routeTypeForMode(mode: TransportMode): RouteType {
  return mode === 'flight' || mode === 'other' ? 'straight' : 'directions';
}

function maybeApplyMapsAvailabilityWindows(
  availabilityWindows: string,
  place?: PlaceSearchResult | null,
  previousPlace?: PlaceSearchResult | null,
): string {
  const mapsWindows = place?.mapsAvailabilityWindows;
  if (!mapsWindows || mapsWindows.length === 0) return availabilityWindows;
  const nextMapsValue = serializeAvailabilityWindows(mapsWindows);

  if (!hasAvailabilityConstraints({ availabilityWindows })) {
    return nextMapsValue;
  }

  const previousMapsWindows = previousPlace?.mapsAvailabilityWindows;
  if (!previousMapsWindows || previousMapsWindows.length === 0) {
    return availabilityWindows;
  }

  const previousMapsValue = serializeAvailabilityWindows(previousMapsWindows);
  return availabilityWindows === previousMapsValue ? nextMapsValue : availabilityWindows;
}

function draftFromProps(
  initialType: ItemType | undefined,
  initialTransportMode: TransportMode | undefined,
  initialRouteType: RouteType | undefined,
  initialStartTime: string | undefined,
  initialEndTime: string | undefined,
  initialAvailabilityWindows: string | undefined,
  initialTimelineLocked: boolean | undefined,
): EventEditorValue {
  const mode = initialTransportMode ?? 'driving';
  const routeType = initialRouteType ?? routeTypeForMode(mode);
  let duration = 60;
  if (initialStartTime && initialEndTime) {
    const [sh, sm] = initialStartTime.split(':').map(Number);
    const [eh, em] = initialEndTime.split(':').map(Number);
    const nextDuration = eh * 60 + em - (sh * 60 + sm);
    if (nextDuration > 0) duration = nextDuration;
  }
  return {
    type: initialType ?? 'attraction',
    transportMode: mode,
    itemRouteType: routeType,
    scheduledStart: initialStartTime ?? '',
    scheduledEnd: initialEndTime ?? '',
    durationMinutes: duration,
    notesMd: '',
    availabilityWindows: initialAvailabilityWindows ?? '[]',
    timelineLocked: initialTimelineLocked ?? false,
  };
}

export function AddItemDialog({
  isOpen,
  onClose,
  onAdd,
  isSubmitting,
  initialPlace,
  initialDestination,
  initialLocation,
  initialStartTime,
  initialEndTime,
  initialType,
  initialTransportMode,
  initialRouteType,
  initialAvailabilityWindows,
  initialTimelineLocked,
  initialTravelFromItemId,
  initialTravelToItemId,
  defaultDate,
}: AddItemDialogProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [destPlace, setDestPlace] = useState<PlaceSearchResult | null>(null);
  const [isRouteOpen, setIsRouteOpen] = useState(true);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [customName, setCustomName] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [calculatedRoute, setCalculatedRoute] = useState<{
    itemRoutePathEncoded: string;
    itemRouteDistanceMeters: number;
    itemRouteDurationMinutes: number;
  } | null>(null);
  const [editor, setEditor] = useState<EventEditorValue>(() =>
    draftFromProps(
      initialType,
      initialTransportMode,
      initialRouteType,
      initialStartTime,
      initialEndTime,
      initialAvailabilityWindows,
      initialTimelineLocked,
    ),
  );

  const initialDraft = useMemo(
    () =>
      draftFromProps(
        initialType,
        initialTransportMode,
        initialRouteType,
        initialStartTime,
        initialEndTime,
        initialAvailabilityWindows,
        initialTimelineLocked,
      ),
    [
      initialType,
      initialTransportMode,
      initialRouteType,
      initialStartTime,
      initialEndTime,
      initialAvailabilityWindows,
      initialTimelineLocked,
    ],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (initialPlace) {
      setSelectedPlace(initialPlace);
      setCustomName('');
      setEditor({
        ...initialDraft,
        type:
          !initialType && initialPlace.types.length > 0
            ? inferItemType(initialPlace.types)
            : initialDraft.type,
        availabilityWindows: maybeApplyMapsAvailabilityWindows(
          initialDraft.availabilityWindows,
          initialPlace,
        ),
      });
    } else if (initialLocation) {
      setSelectedPlace({
        placeId: `custom-${Date.now()}`,
        name: '',
        address: `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`,
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        types: [],
      });
      setCustomName('');
      setEditor(initialDraft);
    } else {
      setSelectedPlace(null);
      setCustomName('');
      setEditor(initialDraft);
    }

    setDestPlace(initialDestination ?? null);
    setCalculatedRoute(null);
    setIsCalculatingRoute(false);
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    setIsRouteOpen(true);
  }, [isOpen, initialPlace, initialDestination, initialLocation, initialType, initialDraft]);

  useEscapeHotkey(isOpen, onClose);

  const isCustomLocation = selectedPlace?.placeId.startsWith('custom-');
  const isOriginValid = Boolean(selectedPlace) && (!isCustomLocation || Boolean(customName.trim()));
  const showTravelControls = Boolean(destPlace) || editor.type === 'transport';
  const openInGoogleMapsUrl = useMemo(() => {
    if (!selectedPlace || !destPlace) return undefined;
    return buildGoogleMapsDirectionsUrl({
      origin: { lat: selectedPlace.lat, lng: selectedPlace.lng },
      destination: { lat: destPlace.lat, lng: destPlace.lng },
      mode: editor.transportMode,
    });
  }, [destPlace, editor.transportMode, selectedPlace]);
  const travelBadge = useMemo(() => {
    const modeLabel =
      editor.transportMode === 'driving'
        ? 'Drive'
        : editor.transportMode === 'walking'
          ? 'Walk'
          : editor.transportMode === 'bicycling'
            ? 'Bike'
            : editor.transportMode === 'transit'
              ? 'Transit'
              : editor.transportMode === 'flight'
                ? 'Flight'
                : 'Other';
    const routeLabel = editor.itemRouteType === 'directions' ? 'Routed' : 'Straight';
    const duration =
      calculatedRoute && calculatedRoute.itemRouteDurationMinutes > 0
        ? `${calculatedRoute.itemRouteDurationMinutes}m`
        : '';
    return `${modeLabel} \u00b7 ${routeLabel}${duration ? ` \u00b7 ${duration}` : ''}`;
  }, [calculatedRoute, editor.itemRouteType, editor.transportMode]);

  const clearCalculatedRoute = useCallback(() => {
    setCalculatedRoute(null);
  }, []);

  const handleCalculateRoute = useCallback(async () => {
    if (!selectedPlace || !destPlace || editor.itemRouteType !== 'directions') return;
    setIsCalculatingRoute(true);
    try {
      const result = await mapsRepository.calculateLeg(
        { lat: selectedPlace.lat, lng: selectedPlace.lng },
        { lat: destPlace.lat, lng: destPlace.lng },
        editor.transportMode,
      );

      if (result) {
        setCalculatedRoute({
          itemRoutePathEncoded: result.routePathEncoded,
          itemRouteDistanceMeters: result.distanceMeters,
          itemRouteDurationMinutes: result.durationMinutes,
        });

        if (result.durationMinutes > 0) {
          setEditor((prev) => {
            let nextDuration = result.durationMinutes;
            const next: EventEditorValue = { ...prev, durationMinutes: nextDuration };
            if (prev.scheduledStart) {
              const [startHour, startMin] = prev.scheduledStart.split(':').map(Number);
              const startTotalMin = startHour * 60 + startMin;
              const maxDuration = Math.max(0, 23 * 60 + 59 - startTotalMin);
              nextDuration = Math.min(nextDuration, maxDuration);
              next.durationMinutes = nextDuration;
              const endTotalMin = startTotalMin + nextDuration;
              const endHour = Math.floor(endTotalMin / 60);
              const endMinute = endTotalMin % 60;
              next.scheduledEnd = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            }
            return next;
          });
        }
        return;
      }

      // If directions are unavailable, still cache straight-line distance.
      const straight = mapsRepository.calculateStraightLeg(
        { lat: selectedPlace.lat, lng: selectedPlace.lng },
        { lat: destPlace.lat, lng: destPlace.lng },
      );
      setCalculatedRoute({
        itemRoutePathEncoded: '',
        itemRouteDistanceMeters: straight.distanceMeters,
        itemRouteDurationMinutes: straight.durationMinutes,
      });
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [selectedPlace, destPlace, editor.itemRouteType, editor.transportMode]);

  const handleSubmit = () => {
    if (!selectedPlace) return;
    const placeName = isCustomLocation ? customName.trim() : selectedPlace.name;
    if (!placeName) return;
    onAdd({
      placeId: selectedPlace.placeId,
      placeName,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      address: selectedPlace.address,
      type: editor.type,
      durationMinutes: editor.durationMinutes,
      notesMd: editor.notesMd,
      scheduledStart: editor.scheduledStart,
      scheduledEnd: editor.scheduledEnd,
      destLat: destPlace?.lat ?? 0,
      destLng: destPlace?.lng ?? 0,
      destName: destPlace?.name ?? '',
      destAddress: destPlace?.address ?? '',
      transportMode: editor.transportMode,
      itemRouteType: editor.itemRouteType,
      itemRoutePathEncoded: calculatedRoute?.itemRoutePathEncoded ?? '',
      itemRouteDistanceMeters: calculatedRoute?.itemRouteDistanceMeters ?? 0,
      itemRouteDurationMinutes: calculatedRoute?.itemRouteDurationMinutes ?? 0,
      availabilityWindows: editor.availabilityWindows,
      timelineLocked: editor.timelineLocked,
      travelFromItemId: initialTravelFromItemId ?? '',
      travelToItemId: initialTravelToItemId ?? '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-theme">Add Event to Itinerary</h2>
        </div>

        <div className="mb-3 rounded-xl border border-theme bg-theme-subtle">
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
                {showTravelControls ? travelBadge : 'Origin and destination'}
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
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                    </span>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-theme-tertiary">
                      Origin
                    </label>
                  </div>

                  {isEditingOrigin ? (
                    <div className="space-y-1.5">
                      <PlaceSearch
                        onSelect={(place) => {
                          setSelectedPlace(place);
                          setCustomName('');
                          setIsEditingOrigin(false);
                          clearCalculatedRoute();
                          setEditor((prev) => {
                            const next: EventEditorValue = {
                              ...prev,
                              availabilityWindows: maybeApplyMapsAvailabilityWindows(
                                prev.availabilityWindows,
                                place,
                                selectedPlace,
                              ),
                            };
                            if (!initialType && place.types.length > 0) {
                              next.type = inferItemType(place.types);
                            }
                            return next;
                          });
                        }}
                        placeholder="Search origin..."
                      />
                      {selectedPlace ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingOrigin(false)}
                          className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  ) : isCustomLocation ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 rounded-lg border border-theme bg-theme-elevated px-2.5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-theme">Map pin</p>
                          <p className="truncate text-[10px] text-theme-tertiary">{selectedPlace?.address}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setIsEditingOrigin(true)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlace(null);
                              setCustomName('');
                              clearCalculatedRoute();
                            }}
                            className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                            aria-label="Clear origin"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-0.5 block text-[10px] text-theme-tertiary">Name</label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Name this location"
                          className="input w-full py-1.5 text-xs"
                        />
                        {!customName.trim() ? (
                          <p className="mt-1 text-[10px] text-red-600">A name is required for map pins.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : selectedPlace ? (
                    <div className="flex items-start gap-2 rounded-lg border border-theme bg-theme-elevated px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-theme">{selectedPlace.name}</p>
                        {selectedPlace.address ? (
                          <p className="truncate text-[10px] text-theme-tertiary">{selectedPlace.address}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingOrigin(true)}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlace(null);
                            clearCalculatedRoute();
                          }}
                          className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                          aria-label="Clear origin"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <PlaceSearch
                      onSelect={(place) => {
                        setSelectedPlace(place);
                        clearCalculatedRoute();
                        setEditor((prev) => {
                          const next: EventEditorValue = {
                            ...prev,
                            availabilityWindows: maybeApplyMapsAvailabilityWindows(
                              prev.availabilityWindows,
                              place,
                              selectedPlace,
                            ),
                          };
                          if (!initialType && place.types.length > 0) {
                            next.type = inferItemType(place.types);
                          }
                          return next;
                        });
                      }}
                      placeholder="Search origin..."
                    />
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-accent" />
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-theme-tertiary">
                      Destination (optional)
                    </label>
                  </div>

                  {isEditingDestination || !destPlace ? (
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <PlaceSearch
                          onSelect={(place) => {
                            setDestPlace(place);
                            setIsEditingDestination(false);
                            clearCalculatedRoute();
                          }}
                          placeholder="Search destination..."
                        />
                        {isEditingDestination && destPlace ? (
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
                            transportMode={editor.transportMode}
                            itemRouteType={editor.itemRouteType}
                            onChange={(next) => {
                              setEditor((prev) => {
                                if (
                                  prev.transportMode !== next.transportMode ||
                                  prev.itemRouteType !== next.itemRouteType
                                ) {
                                  clearCalculatedRoute();
                                }
                                return { ...prev, ...next };
                              });
                            }}
                            hasOrigin={Boolean(selectedPlace)}
                            hasDestination={Boolean(destPlace)}
                            openInGoogleMapsUrl={openInGoogleMapsUrl}
                            onCalculateRoute={handleCalculateRoute}
                            isCalculatingRoute={isCalculatingRoute}
                            canCalculateRoute={Boolean(
                              selectedPlace && destPlace && editor.itemRouteType === 'directions',
                            )}
                            hasCalculatedRoute={Boolean(calculatedRoute)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-theme bg-theme-elevated">
                      <div className="flex items-start gap-2 px-2.5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-theme">{destPlace.name}</p>
                          {destPlace.address ? (
                            <p className="truncate text-[10px] text-theme-tertiary">{destPlace.address}</p>
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
                              setDestPlace(null);
                              clearCalculatedRoute();
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
                            transportMode={editor.transportMode}
                            itemRouteType={editor.itemRouteType}
                            onChange={(next) => {
                              setEditor((prev) => {
                                if (
                                  prev.transportMode !== next.transportMode ||
                                  prev.itemRouteType !== next.itemRouteType
                                ) {
                                  clearCalculatedRoute();
                                }
                                return { ...prev, ...next };
                              });
                            }}
                            hasOrigin={Boolean(selectedPlace)}
                            hasDestination={Boolean(destPlace)}
                            openInGoogleMapsUrl={openInGoogleMapsUrl}
                            onCalculateRoute={handleCalculateRoute}
                            isCalculatingRoute={isCalculatingRoute}
                            canCalculateRoute={Boolean(
                              selectedPlace && destPlace && editor.itemRouteType === 'directions',
                            )}
                            hasCalculatedRoute={Boolean(calculatedRoute)}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-theme">
                      {selectedPlace
                        ? isCustomLocation
                          ? customName.trim() || 'Map pin'
                          : selectedPlace.name
                        : 'Choose starting point'}
                    </p>
                    {selectedPlace?.address ? (
                      <p className="truncate text-[10px] text-theme-tertiary">{selectedPlace.address}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-theme">
                      {destPlace ? destPlace.name : 'No destination'}
                    </p>
                    {destPlace?.address ? (
                      <p className="truncate text-[10px] text-theme-tertiary">{destPlace.address}</p>
                    ) : !destPlace ? (
                      <p className="truncate text-[10px] text-theme-tertiary">Optional</p>
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

        <EventEditorForm
          value={editor}
          onChange={setEditor}
          onSubmit={handleSubmit}
          submitLabel="Add Event to Itinerary"
          isSubmitting={isSubmitting}
          submitDisabled={!isOriginValid}
          defaultDate={defaultDate}
          mapsAvailabilityWindows={selectedPlace?.mapsAvailabilityWindows}
        />
      </div>
    </div>
  );
}
