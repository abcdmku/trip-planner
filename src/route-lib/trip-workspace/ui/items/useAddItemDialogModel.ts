import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { hasAvailabilityConstraints, serializeAvailabilityWindows } from '@/lib/availability';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';
import { useRouteCalculation, type CalculatedRoute } from './useRouteCalculation';
import type { EventEditorValue } from './EventEditorForm';

export interface AddItemDialogModelInput {
  isOpen: boolean;
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
}

export interface AddItemDialogModel {
  selectedPlace: PlaceSearchResult | null;
  destPlace: PlaceSearchResult | null;
  isRouteOpen: boolean;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  customName: string;
  editor: EventEditorValue;
  calculatedRoute: CalculatedRoute | null;
  isCalculatingRoute: boolean;
  openInGoogleMapsUrl?: string;
  travelBadge: string;
  isCustomLocation: boolean;
  isOriginValid: boolean;
  showTravelControls: boolean;
  handleRouteToggle: () => void;
  handleOriginEditStart: () => void;
  handleOriginEditCancel: () => void;
  handleDestinationEditStart: () => void;
  handleDestinationEditCancel: () => void;
  handleOriginSelect: (place: PlaceSearchResult) => void;
  handleDestinationSelect: (place: PlaceSearchResult) => void;
  handleOriginClear: () => void;
  handleDestinationClear: () => void;
  handleCustomNameChange: (value: string) => void;
  handleEditorChange: (next: EventEditorValue) => void;
  handleCalculateRoute: () => Promise<CalculatedRoute | null>;
  resetOnOpen: () => void;
  clearCalculatedRoute: () => void;
  handleRouteChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
}

function inferItemType(googleTypes: string[]): ItemType {
  const s = new Set(googleTypes);
  if (s.has('lodging') || s.has('hotel') || s.has('motel') || s.has('resort_hotel')) return 'hotel';
  if (s.has('restaurant') || s.has('food') || s.has('cafe') || s.has('bar')) return 'restaurant';
  if (
    s.has('airport') ||
    s.has('train_station') ||
    s.has('transit_station') ||
    s.has('bus_station')
  )
    return 'transport';
  if (s.has('museum') || s.has('art_gallery') || s.has('tourist_attraction') || s.has('park'))
    return 'attraction';
  if (s.has('gym') || s.has('spa') || s.has('stadium') || s.has('amusement_park'))
    return 'activity';
  return 'other';
}

function routeTypeForMode(mode: TransportMode): RouteType {
  return mode === 'flight' || mode === 'other' ? 'straight' : 'directions';
}

function transportModeLabel(mode: TransportMode): string {
  switch (mode) {
    case 'driving':
      return 'Drive';
    case 'walking':
      return 'Walk';
    case 'bicycling':
      return 'Bike';
    case 'transit':
      return 'Transit';
    case 'flight':
      return 'Flight';
    default:
      return 'Other';
  }
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

export function useAddItemDialogModel({
  isOpen,
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
}: AddItemDialogModelInput): AddItemDialogModel {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [destPlace, setDestPlace] = useState<PlaceSearchResult | null>(null);
  const [isRouteOpen, setIsRouteOpen] = useState(true);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [customName, setCustomName] = useState('');
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

  const handleCalculatedRoute = useCallback((route: CalculatedRoute) => {
    if (route.itemRouteDurationMinutes <= 0) return;

    setEditor((prev) => {
      let nextDuration = route.itemRouteDurationMinutes;
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
  }, []);

  const { calculatedRoute, isCalculatingRoute, calculateRoute, clearCalculatedRoute } =
    useRouteCalculation({
      origin: selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : null,
      destination: destPlace ? { lat: destPlace.lat, lng: destPlace.lng } : null,
      transportMode: editor.transportMode,
      routeType: editor.itemRouteType,
      onCalculated: handleCalculatedRoute,
    });

  const isCustomLocation = Boolean(selectedPlace?.placeId.startsWith('custom-'));
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
    const routeLabel = editor.itemRouteType === 'directions' ? 'Routed' : 'Straight';
    const duration =
      calculatedRoute && calculatedRoute.itemRouteDurationMinutes > 0
        ? `${calculatedRoute.itemRouteDurationMinutes}m`
        : '';
    return `${transportModeLabel(editor.transportMode)} · ${routeLabel}${duration ? ` · ${duration}` : ''}`;
  }, [calculatedRoute, editor.itemRouteType, editor.transportMode]);

  const resetOnOpen = useCallback(() => {
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
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    setIsRouteOpen(true);
    clearCalculatedRoute();
  }, [clearCalculatedRoute, initialDraft, initialDestination, initialLocation, initialPlace, initialType]);

  useEffect(() => {
    if (!isOpen) return;
    resetOnOpen();
  }, [isOpen, resetOnOpen]);

  const handleRouteToggle = useCallback(() => {
    if (isRouteOpen) {
      setIsEditingOrigin(false);
      setIsEditingDestination(false);
    }
    setIsRouteOpen((current) => !current);
  }, [isRouteOpen]);

  const handleOriginEditStart = useCallback(() => setIsEditingOrigin(true), []);
  const handleOriginEditCancel = useCallback(() => setIsEditingOrigin(false), []);
  const handleDestinationEditStart = useCallback(() => setIsEditingDestination(true), []);
  const handleDestinationEditCancel = useCallback(() => setIsEditingDestination(false), []);
  const handleCustomNameChange = useCallback((value: string) => setCustomName(value), []);

  const handleOriginSelect = useCallback(
    (place: PlaceSearchResult) => {
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
    },
    [clearCalculatedRoute, initialType, selectedPlace],
  );

  const handleDestinationSelect = useCallback(
    (place: PlaceSearchResult) => {
      setDestPlace(place);
      setIsEditingDestination(false);
      clearCalculatedRoute();
    },
    [clearCalculatedRoute],
  );

  const handleOriginClear = useCallback(() => {
    setSelectedPlace(null);
    setCustomName('');
    clearCalculatedRoute();
  }, [clearCalculatedRoute]);

  const handleDestinationClear = useCallback(() => {
    setDestPlace(null);
    clearCalculatedRoute();
  }, [clearCalculatedRoute]);

  const handleEditorChange = useCallback(
    (next: EventEditorValue) => {
      setEditor((current) => {
        if (
          current.transportMode !== next.transportMode ||
          current.itemRouteType !== next.itemRouteType
        ) {
          clearCalculatedRoute();
        }
        return next;
      });
    },
    [clearCalculatedRoute],
  );

  const handleRouteChange = useCallback(
    (next: { transportMode: TransportMode; itemRouteType: RouteType }) => {
      setEditor((prev) => {
        if (prev.transportMode !== next.transportMode || prev.itemRouteType !== next.itemRouteType) {
          clearCalculatedRoute();
        }
        return { ...prev, ...next };
      });
    },
    [clearCalculatedRoute],
  );

  return {
    selectedPlace,
    destPlace,
    isRouteOpen,
    isEditingOrigin,
    isEditingDestination,
    customName,
    editor,
    calculatedRoute,
    isCalculatingRoute,
    openInGoogleMapsUrl,
    travelBadge,
    isCustomLocation,
    isOriginValid,
    showTravelControls,
    handleRouteToggle,
    handleOriginEditStart,
    handleOriginEditCancel,
    handleDestinationEditStart,
    handleDestinationEditCancel,
    handleOriginSelect,
    handleDestinationSelect,
    handleOriginClear,
    handleDestinationClear,
    handleCustomNameChange,
    handleEditorChange,
    handleCalculateRoute: calculateRoute,
    resetOnOpen,
    clearCalculatedRoute,
    handleRouteChange,
  };
}
