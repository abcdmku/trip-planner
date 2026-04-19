import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Item } from '@/types/trip';
import { mapsRepository, type PlaceSearchResult } from '@/services/maps-repository';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';
import { useRouteCalculation, type CalculatedRoute } from './useRouteCalculation';
import type { EventEditorValue } from './EventEditorForm';

export interface ItemDetailCardModelInput {
  item: Item;
  onUpdate?: (updates: Partial<Item>) => void;
}

export interface ItemDetailCardModel {
  rootRef: RefObject<HTMLDivElement>;
  editorValue: EventEditorValue;
  originPlaceDetails: PlaceSearchResult | null;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  calculatedRoute: CalculatedRoute | null;
  isCalculatingRoute: boolean;
  openInGoogleMapsUrl?: string;
  displayedRouteDurationMinutes: number;
  hasCalculatedRoute: boolean;
  hasOrigin: boolean;
  hasDest: boolean;
  showTravelControls: boolean;
  handleEditorChange: (next: EventEditorValue) => void;
  handleOriginSelect: (place: PlaceSearchResult) => void;
  handleDestinationSelect: (place: PlaceSearchResult) => void;
  handleOriginEditStart: () => void;
  handleOriginEditCancel: () => void;
  handleDestinationEditStart: () => void;
  handleDestinationEditCancel: () => void;
  handleDestinationClear: () => void;
  handleRouteChange: (next: {
    transportMode: EventEditorValue['transportMode'];
    itemRouteType: EventEditorValue['itemRouteType'];
  }) => void;
  handleCalculateRoute: () => Promise<CalculatedRoute | null>;
  clearCalculatedRoute: () => void;
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

function areEditorValuesEqual(left: EventEditorValue, right: EventEditorValue): boolean {
  return (
    left.type === right.type &&
    left.transportMode === right.transportMode &&
    left.itemRouteType === right.itemRouteType &&
    left.scheduledStart === right.scheduledStart &&
    left.scheduledEnd === right.scheduledEnd &&
    left.durationMinutes === right.durationMinutes &&
    left.notesMd === right.notesMd &&
    left.availabilityWindows === right.availabilityWindows &&
    left.timelineLocked === right.timelineLocked
  );
}

export function useItemDetailCardModel({ item, onUpdate }: ItemDetailCardModelInput): ItemDetailCardModel {
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [originPlaceDetails, setOriginPlaceDetails] = useState<PlaceSearchResult | null>(null);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const previousItemIdRef = useRef(item.itemId);
  const nextEditorValue = useMemo(() => itemToEditorValue(item), [item]);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;
  const showTravelControls = hasDest || editorValue.type === 'transport';

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  const handleCalculatedRoute = useCallback(
    (route: CalculatedRoute) => {
      if (route.itemRouteDurationMinutes <= 0) return;

      setEditorValue((prev) => {
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

      commit({
        itemRoutePathEncoded: route.itemRoutePathEncoded,
        itemRouteDistanceMeters: route.itemRouteDistanceMeters,
        itemRouteDurationMinutes: route.itemRouteDurationMinutes,
      });
    },
    [commit],
  );

  const { calculatedRoute, isCalculatingRoute, calculateRoute, clearCalculatedRoute } =
    useRouteCalculation({
      origin: hasOrigin ? { lat: item.lat, lng: item.lng } : null,
      destination: hasDest ? { lat: item.destLat, lng: item.destLng } : null,
      transportMode: editorValue.transportMode,
      routeType: editorValue.itemRouteType,
      onCalculated: handleCalculatedRoute,
    });

  const displayedRouteDurationMinutes =
    calculatedRoute?.itemRouteDurationMinutes ?? item.itemRouteDurationMinutes;
  const openInGoogleMapsUrl = useMemo(() => {
    if (!hasOrigin || !hasDest) return undefined;
    return buildGoogleMapsDirectionsUrl({
      origin: { lat: item.lat, lng: item.lng },
      destination: { lat: item.destLat, lng: item.destLng },
      mode: editorValue.transportMode,
    });
  }, [
    editorValue.transportMode,
    hasDest,
    hasOrigin,
    item.destLat,
    item.destLng,
    item.lat,
    item.lng,
  ]);

  const hasCalculatedRoute = useMemo(() => {
    return (
      Boolean(calculatedRoute?.itemRoutePathEncoded) ||
      item.itemRouteDistanceMeters > 0 ||
      displayedRouteDurationMinutes > 0
    );
  }, [calculatedRoute?.itemRoutePathEncoded, displayedRouteDurationMinutes, item.itemRouteDistanceMeters]);

  useEffect(() => {
    const didSwitchItems = previousItemIdRef.current !== item.itemId;
    previousItemIdRef.current = item.itemId;

    setEditorValue((current) => {
      if (areEditorValuesEqual(current, nextEditorValue)) {
        return current;
      }

      const activeElement =
        typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (!didSwitchItems && activeElement && rootRef.current?.contains(activeElement)) {
        return current;
      }

      return nextEditorValue;
    });
  }, [item.itemId, nextEditorValue]);

  useEffect(() => {
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    clearCalculatedRoute();
  }, [clearCalculatedRoute, item.itemId]);

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

  const handleEditorChange = useCallback(
    (next: EventEditorValue) => {
      setEditorValue(next);
      const updates: Partial<Item> = {};
      if (next.type !== editorValue.type) updates.type = next.type;
      if (next.transportMode !== editorValue.transportMode)
        updates.transportMode = next.transportMode;
      if (next.itemRouteType !== editorValue.itemRouteType)
        updates.itemRouteType = next.itemRouteType;
      if (next.scheduledStart !== editorValue.scheduledStart)
        updates.scheduledStart = next.scheduledStart;
      if (next.scheduledEnd !== editorValue.scheduledEnd) updates.scheduledEnd = next.scheduledEnd;
      if (next.durationMinutes !== editorValue.durationMinutes)
        updates.durationMinutes = next.durationMinutes;
      if (next.notesMd !== editorValue.notesMd) updates.notesMd = next.notesMd;
      if (next.availabilityWindows !== editorValue.availabilityWindows) {
        updates.availabilityWindows = next.availabilityWindows;
      }
      if (next.timelineLocked !== editorValue.timelineLocked)
        updates.timelineLocked = next.timelineLocked;

      if (
        next.transportMode !== editorValue.transportMode ||
        next.itemRouteType !== editorValue.itemRouteType
      ) {
        updates.itemRoutePathEncoded = '';
        updates.itemRouteDistanceMeters = 0;
        updates.itemRouteDurationMinutes = 0;
        clearCalculatedRoute();
      }

      if (Object.keys(updates).length > 0) {
        commit(updates);
      }
    },
    [clearCalculatedRoute, commit, editorValue],
  );

  const handleOriginSelect = useCallback(
    (place: PlaceSearchResult) => {
      clearCalculatedRoute();
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
    },
    [clearCalculatedRoute, commit],
  );

  const handleDestinationSelect = useCallback(
    (place: PlaceSearchResult) => {
      clearCalculatedRoute();
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
    },
    [clearCalculatedRoute, commit],
  );

  const handleOriginEditStart = useCallback(() => setIsEditingOrigin(true), []);
  const handleOriginEditCancel = useCallback(() => setIsEditingOrigin(false), []);
  const handleDestinationEditStart = useCallback(() => setIsEditingDestination(true), []);
  const handleDestinationEditCancel = useCallback(() => setIsEditingDestination(false), []);

  const handleDestinationClear = useCallback(() => {
    clearCalculatedRoute();
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
  }, [clearCalculatedRoute, commit]);

  const handleRouteChange = useCallback(
    (next: { transportMode: EventEditorValue['transportMode']; itemRouteType: EventEditorValue['itemRouteType'] }) => {
      setEditorValue((prev) => {
        if (prev.transportMode !== next.transportMode || prev.itemRouteType !== next.itemRouteType) {
          clearCalculatedRoute();
        }
        return { ...prev, ...next };
      });
      commit(next.transportMode !== editorValue.transportMode || next.itemRouteType !== editorValue.itemRouteType
        ? { transportMode: next.transportMode, itemRouteType: next.itemRouteType, itemRoutePathEncoded: '', itemRouteDistanceMeters: 0, itemRouteDurationMinutes: 0 }
        : { transportMode: next.transportMode, itemRouteType: next.itemRouteType });
    },
    [clearCalculatedRoute, commit, editorValue.itemRouteType, editorValue.transportMode],
  );

  return {
    rootRef,
    editorValue,
    originPlaceDetails,
    isEditingOrigin,
    isEditingDestination,
    calculatedRoute,
    isCalculatingRoute,
    openInGoogleMapsUrl,
    displayedRouteDurationMinutes,
    hasCalculatedRoute,
    hasOrigin,
    hasDest,
    showTravelControls,
    handleEditorChange,
    handleOriginSelect,
    handleDestinationSelect,
    handleOriginEditStart,
    handleOriginEditCancel,
    handleDestinationEditStart,
    handleDestinationEditCancel,
    handleDestinationClear,
    handleRouteChange,
    handleCalculateRoute: calculateRoute,
    clearCalculatedRoute,
  };
}
