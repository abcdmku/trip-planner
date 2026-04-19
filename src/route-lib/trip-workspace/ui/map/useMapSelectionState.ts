import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import type { PresenceMapOpenLocation } from '@/types/collaboration';
import type { Item } from '@/types/trip';
import { mapsRepository, type PlaceSearchResult } from '@/services/maps-repository';

interface SelectedMapPlaceState {
  position: { lat: number; lng: number };
  place: PlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
}

interface SelectedMarkerPlaceState {
  place: PlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
}

function buildFallbackPlace(
  openLocation: PresenceMapOpenLocation | null | undefined,
): PlaceSearchResult | null {
  if (!openLocation || (!openLocation.placeId && !openLocation.name && !openLocation.address)) {
    return null;
  }

  return {
    placeId: openLocation.placeId ?? '',
    name: openLocation.name ?? 'Selected place',
    address: openLocation.address ?? '',
    lat: openLocation.position.lat,
    lng: openLocation.position.lng,
    types: [],
  };
}

function isSyntheticPlaceId(placeId: string | undefined): boolean {
  return (
    !placeId ||
    placeId.startsWith('item-dest-') ||
    placeId.startsWith('item-origin-') ||
    placeId.startsWith('custom-')
  );
}

export function useMapSelectionState({
  visibleItems,
  selectedItemId,
  onSelectedItemChange,
  onMarkerClick,
  onItemRouteClick,
  onAddPlaceToItinerary,
  openLocation,
  onOpenLocationChange,
}: {
  visibleItems: Item[];
  selectedItemId?: string | null;
  onSelectedItemChange?: (itemId: string | null) => void;
  onMarkerClick?: (itemId: string) => void;
  onItemRouteClick?: (itemId: string) => void;
  onAddPlaceToItinerary?: (place: PlaceSearchResult) => void;
  openLocation?: PresenceMapOpenLocation | null;
  onOpenLocationChange?: (location: PresenceMapOpenLocation | null) => void;
}) {
  const [internalSelectedItemId, setInternalSelectedItemId] = useState<string | null>(null);
  const [selectedMarkerPlace, setSelectedMarkerPlace] = useState<SelectedMarkerPlaceState | null>(null);
  const [selectedMapPlace, setSelectedMapPlace] = useState<SelectedMapPlaceState | null>(null);
  const placeLookupRequestIdRef = useRef(0);
  const markerLookupRequestIdRef = useRef(0);
  const placeDetailsCacheRef = useRef<Map<string, PlaceSearchResult | null>>(new Map());

  const isSelectionControlled = selectedItemId !== undefined;
  const effectiveSelectedItemId = isSelectionControlled ? selectedItemId : internalSelectedItemId;

  const setSelectedItem = useCallback(
    (itemId: string | null) => {
      if (!isSelectionControlled) {
        setInternalSelectedItemId(itemId);
      }
      onSelectedItemChange?.(itemId);
    },
    [isSelectionControlled, onSelectedItemChange],
  );

  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.itemId === effectiveSelectedItemId) ?? null,
    [effectiveSelectedItemId, visibleItems],
  );

  const clearMapPlaceSelection = useCallback(
    (notifyOpenLocation = true) => {
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      if (notifyOpenLocation) {
        onOpenLocationChange?.(null);
      }
    },
    [onOpenLocationChange],
  );

  const clearItemSelection = useCallback(() => {
    markerLookupRequestIdRef.current += 1;
    setSelectedMarkerPlace(null);
    setSelectedItem(null);
  }, [setSelectedItem]);

  const clearAllSelections = useCallback(
    (notifyOpenLocation = true) => {
      clearMapPlaceSelection(notifyOpenLocation);
      markerLookupRequestIdRef.current += 1;
      setSelectedMarkerPlace(null);
      setSelectedItem(null);
    },
    [clearMapPlaceSelection, setSelectedItem],
  );

  const resolveOpenLocation = useCallback((nextOpenLocation: PresenceMapOpenLocation | null) => {
    placeLookupRequestIdRef.current += 1;
    const requestId = placeLookupRequestIdRef.current;

    if (!nextOpenLocation) {
      setSelectedMapPlace(null);
      return;
    }

    const fallbackPlace = buildFallbackPlace(nextOpenLocation);
    const cached =
      nextOpenLocation.placeId != null
        ? placeDetailsCacheRef.current.get(nextOpenLocation.placeId)
        : undefined;

    if (cached !== undefined || !nextOpenLocation.placeId) {
      setSelectedMapPlace({
        position: nextOpenLocation.position,
        place: cached ?? fallbackPlace,
        isLoading: false,
        error: cached || fallbackPlace ? null : 'Place details are unavailable for this location.',
      });
      return;
    }

    setSelectedMapPlace({
      position: nextOpenLocation.position,
      place: fallbackPlace,
      isLoading: true,
      error: null,
    });

    void mapsRepository
      .getPlaceDetails(nextOpenLocation.placeId)
      .then((placeDetails) => {
        if (placeLookupRequestIdRef.current !== requestId) return;
        placeDetailsCacheRef.current.set(nextOpenLocation.placeId!, placeDetails);
        setSelectedMapPlace({
          position: nextOpenLocation.position,
          place: placeDetails ?? fallbackPlace,
          isLoading: false,
          error: placeDetails || fallbackPlace ? null : 'Place details are unavailable for this location.',
        });
      })
      .catch((error: unknown) => {
        if (placeLookupRequestIdRef.current !== requestId) return;
        setSelectedMapPlace({
          position: nextOpenLocation.position,
          place: fallbackPlace,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load place details.',
        });
      });
  }, []);

  useEffect(() => {
    if (openLocation === undefined) return;
    resolveOpenLocation(openLocation);
  }, [openLocation, resolveOpenLocation]);

  useEffect(() => {
    if (!selectedItem) {
      markerLookupRequestIdRef.current += 1;
      setSelectedMarkerPlace(null);
      return;
    }

    if (isSyntheticPlaceId(selectedItem.placeId)) {
      setSelectedMarkerPlace({
        place: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (placeDetailsCacheRef.current.has(selectedItem.placeId)) {
      const cached = placeDetailsCacheRef.current.get(selectedItem.placeId) ?? null;
      setSelectedMarkerPlace({
        place: cached,
        isLoading: false,
        error: cached ? null : 'Place details are unavailable for this stop.',
      });
      return;
    }

    const requestId = ++markerLookupRequestIdRef.current;
    setSelectedMarkerPlace({
      place: null,
      isLoading: true,
      error: null,
    });

    void mapsRepository
      .getPlaceDetails(selectedItem.placeId)
      .then((placeDetails) => {
        if (markerLookupRequestIdRef.current !== requestId) return;
        placeDetailsCacheRef.current.set(selectedItem.placeId, placeDetails);

        setSelectedMarkerPlace({
          place: placeDetails,
          isLoading: false,
          error: placeDetails ? null : 'Place details are unavailable for this stop.',
        });
      })
      .catch((error: unknown) => {
        if (markerLookupRequestIdRef.current !== requestId) return;
        setSelectedMarkerPlace({
          place: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load place details.',
        });
      });
  }, [selectedItem]);

  const handleMarkerClick = useCallback(
    (itemId: string) => {
      clearMapPlaceSelection();
      setSelectedMarkerPlace(null);
      setSelectedItem(itemId);
      onMarkerClick?.(itemId);
    },
    [clearMapPlaceSelection, onMarkerClick, setSelectedItem],
  );

  const handleItemRouteClick = useCallback(
    (item: Item) => {
      clearAllSelections();
      onItemRouteClick?.(item.itemId);
    },
    [clearAllSelections, onItemRouteClick],
  );

  const handleInfoWindowClose = useCallback(() => {
    clearItemSelection();
  }, [clearItemSelection]);

  const handleMapPlaceInfoClose = useCallback(() => {
    clearMapPlaceSelection();
  }, [clearMapPlaceSelection]);

  const handleAddSelectedPlace = useCallback(
    (place: PlaceSearchResult) => {
      onAddPlaceToItinerary?.(place);
      clearMapPlaceSelection();
    },
    [clearMapPlaceSelection, onAddPlaceToItinerary],
  );

  useEscapeHotkey(selectedMapPlace !== null || selectedItem !== null, () => {
    if (selectedMapPlace) {
      handleMapPlaceInfoClose();
      return;
    }
    if (selectedItem) {
      handleInfoWindowClose();
    }
  });

  return {
    selectedItem,
    selectedMarkerPlace,
    selectedMapPlace,
    effectiveSelectedItemId,
    clearAllSelections,
    resolveOpenLocation,
    handleMarkerClick,
    handleItemRouteClick,
    handleInfoWindowClose,
    handleMapPlaceInfoClose,
    handleAddSelectedPlace,
  };
}
