import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { hasAvailabilityConstraints, serializeAvailabilityWindows } from '@/lib/availability';
import {
  applyCalculatedRouteToEditorValue,
  useItemRouteEditorState,
} from './useItemRouteEditorState';
import type { CalculatedRoute } from './useRouteCalculation';
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
  titleValue: string;
  resolvedTitle: string;
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
  canCalculateRoute: boolean;
  hasCalculatedRoute: boolean;
  displayedRouteDurationMinutes: number;
  handleRouteToggle: () => void;
  handleOriginEditStart: () => void;
  handleOriginEditCancel: () => void;
  handleDestinationEditStart: () => void;
  handleDestinationEditCancel: () => void;
  handleOriginSelect: (place: PlaceSearchResult) => void;
  handleDestinationSelect: (place: PlaceSearchResult) => void;
  handleOriginClear: () => void;
  handleDestinationClear: () => void;
  handleTitleChange: (value: string) => void;
  handleCustomNameChange: (value: string) => void;
  handleEditorChange: (next: EventEditorValue) => void;
  handleCalculateRoute: () => Promise<CalculatedRoute | null>;
  resetOnOpen: () => void;
  clearCalculatedRoute: () => void;
  handleRouteChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
}

function inferItemType(googleTypes: string[]): ItemType {
  const typeSet = new Set(googleTypes);
  if (
    typeSet.has('lodging') ||
    typeSet.has('hotel') ||
    typeSet.has('motel') ||
    typeSet.has('resort_hotel')
  ) {
    return 'hotel';
  }
  if (
    typeSet.has('restaurant') ||
    typeSet.has('food') ||
    typeSet.has('cafe') ||
    typeSet.has('bar')
  ) {
    return 'restaurant';
  }
  if (
    typeSet.has('airport') ||
    typeSet.has('train_station') ||
    typeSet.has('transit_station') ||
    typeSet.has('bus_station')
  ) {
    return 'transport';
  }
  if (
    typeSet.has('museum') ||
    typeSet.has('art_gallery') ||
    typeSet.has('tourist_attraction') ||
    typeSet.has('park')
  ) {
    return 'attraction';
  }
  if (
    typeSet.has('gym') ||
    typeSet.has('spa') ||
    typeSet.has('stadium') ||
    typeSet.has('amusement_park')
  ) {
    return 'activity';
  }
  return 'other';
}

function routeTypeForMode(mode: TransportMode): RouteType {
  return mode === 'flight' || mode === 'other' ? 'straight' : 'directions';
}

function defaultTitleForPlace(place: PlaceSearchResult | null, customName = ''): string {
  if (!place) return '';
  return place.placeId.startsWith('custom-') ? customName.trim() : place.name;
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
    const [startHour, startMinute] = initialStartTime.split(':').map(Number);
    const [endHour, endMinute] = initialEndTime.split(':').map(Number);
    const nextDuration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
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
  const [titleValue, setTitleValue] = useState('');
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
      initialAvailabilityWindows,
      initialEndTime,
      initialRouteType,
      initialStartTime,
      initialTimelineLocked,
      initialTransportMode,
      initialType,
    ],
  );
  const titleHasManualOverrideRef = useRef(false);

  const routeEditor = useItemRouteEditorState({
    origin: selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : null,
    destination: destPlace ? { lat: destPlace.lat, lng: destPlace.lng } : null,
    transportMode: editor.transportMode,
    itemRouteType: editor.itemRouteType,
    itemType: editor.type,
    onCalculated: useCallback((route: CalculatedRoute) => {
      setEditor((current) => applyCalculatedRouteToEditorValue(current, route));
    }, []),
  });
  const {
    clearCalculatedRoute,
    resetUiState,
    handleOriginEditCancel,
    handleDestinationEditCancel,
  } = routeEditor;

  const isCustomLocation = Boolean(selectedPlace?.placeId.startsWith('custom-'));
  const isOriginValid = Boolean(selectedPlace) && (!isCustomLocation || Boolean(customName.trim()));
  const resolvedTitle = titleValue.trim() || defaultTitleForPlace(selectedPlace, customName);

  const resetOnOpen = useCallback(() => {
    titleHasManualOverrideRef.current = false;

    if (initialPlace) {
      setSelectedPlace(initialPlace);
      setTitleValue(initialPlace.name);
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
      setTitleValue('');
      setCustomName('');
      setEditor(initialDraft);
    } else {
      setSelectedPlace(null);
      setTitleValue('');
      setCustomName('');
      setEditor(initialDraft);
    }

    setDestPlace(initialDestination ?? null);
    resetUiState();
  }, [
    initialDestination,
    initialDraft,
    initialLocation,
    initialPlace,
    initialType,
    resetUiState,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    resetOnOpen();
  }, [isOpen, resetOnOpen]);

  const handleTitleChange = useCallback((value: string) => {
    titleHasManualOverrideRef.current = true;
    setTitleValue(value);
  }, []);

  const handleCustomNameChange = useCallback(
    (value: string) => {
      const previousDefaultTitle = defaultTitleForPlace(selectedPlace, customName);
      setCustomName(value);

      if (!selectedPlace?.placeId.startsWith('custom-')) {
        return;
      }

      setTitleValue((current) => {
        if (
          !titleHasManualOverrideRef.current ||
          !current.trim() ||
          current.trim() === previousDefaultTitle
        ) {
          titleHasManualOverrideRef.current = false;
          return value;
        }
        return current;
      });
    },
    [customName, selectedPlace],
  );

  const handleOriginSelect = useCallback(
    (place: PlaceSearchResult) => {
      const previousDefaultTitle = defaultTitleForPlace(selectedPlace, customName);
      const nextDefaultTitle = defaultTitleForPlace(place);

      setSelectedPlace(place);
      setCustomName('');
      clearCalculatedRoute();
      handleOriginEditCancel();
      setTitleValue((current) => {
        if (
          !titleHasManualOverrideRef.current ||
          !current.trim() ||
          current.trim() === previousDefaultTitle
        ) {
          titleHasManualOverrideRef.current = false;
          return nextDefaultTitle;
        }
        return current;
      });
      setEditor((current) => {
        const next: EventEditorValue = {
          ...current,
          availabilityWindows: maybeApplyMapsAvailabilityWindows(
            current.availabilityWindows,
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
    [clearCalculatedRoute, customName, handleOriginEditCancel, initialType, selectedPlace],
  );

  const handleDestinationSelect = useCallback(
    (place: PlaceSearchResult) => {
      setDestPlace(place);
      clearCalculatedRoute();
      handleDestinationEditCancel();
    },
    [clearCalculatedRoute, handleDestinationEditCancel],
  );

  const handleOriginClear = useCallback(() => {
    setSelectedPlace(null);
    setTitleValue('');
    setCustomName('');
    titleHasManualOverrideRef.current = false;
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
      setEditor((current) => {
        if (
          current.transportMode !== next.transportMode ||
          current.itemRouteType !== next.itemRouteType
        ) {
          clearCalculatedRoute();
        }
        return { ...current, ...next };
      });
    },
    [clearCalculatedRoute],
  );

  return {
    selectedPlace,
    destPlace,
    titleValue,
    resolvedTitle,
    isRouteOpen: routeEditor.isRouteOpen,
    isEditingOrigin: routeEditor.isEditingOrigin,
    isEditingDestination: routeEditor.isEditingDestination,
    customName,
    editor,
    calculatedRoute: routeEditor.calculatedRoute,
    isCalculatingRoute: routeEditor.isCalculatingRoute,
    openInGoogleMapsUrl: routeEditor.openInGoogleMapsUrl,
    travelBadge: routeEditor.routeBadge,
    isCustomLocation,
    isOriginValid,
    showTravelControls: routeEditor.showTravelControls,
    canCalculateRoute: routeEditor.canCalculateRoute,
    hasCalculatedRoute: routeEditor.hasCalculatedRoute,
    displayedRouteDurationMinutes: routeEditor.displayedRouteDurationMinutes,
    handleRouteToggle: routeEditor.handleRouteToggle,
    handleOriginEditStart: routeEditor.handleOriginEditStart,
    handleOriginEditCancel: routeEditor.handleOriginEditCancel,
    handleDestinationEditStart: routeEditor.handleDestinationEditStart,
    handleDestinationEditCancel: routeEditor.handleDestinationEditCancel,
    handleOriginSelect,
    handleDestinationSelect,
    handleOriginClear,
    handleDestinationClear,
    handleTitleChange,
    handleCustomNameChange,
    handleEditorChange,
    handleCalculateRoute: routeEditor.handleCalculateRoute,
    resetOnOpen,
    clearCalculatedRoute,
    handleRouteChange,
  };
}
