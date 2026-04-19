import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  APIProvider,
  Map,
  useMap,
  type MapCameraChangedEvent,
  type MapMouseEvent,
  type ColorScheme,
} from '@vis.gl/react-google-maps';
import type { Item, Leg, Day, Trip, TransportMode } from '../../types/trip';
import { useTheme } from '../../hooks/useTheme';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';
import { mapsRepository, type PlaceSearchResult } from '../../services/maps-repository';
import type { PresenceMapCamera, PresenceMapOpenLocation } from '@/types/collaboration';
import ItemMarker from './ItemMarker';
import UnifiedInfoWindow from './UnifiedInfoWindow';
import RouteOverlay from './RouteOverlay';
import StartLocationMarker from './StartLocationMarker';
import ItemRouteOverlay from './ItemRouteOverlay';
import TimelineConnectorOverlay from './TimelineConnectorOverlay';
import type { TimelineConnector } from '@/lib/connectors';

// ---------------------------------------------------------------------------
// MapReady context -- lets descendants know when the Google Map instance is
// fully loaded and interactive.
// ---------------------------------------------------------------------------

interface MapReadyContextValue {
  isMapReady: boolean;
}

const MapReadyContext = createContext<MapReadyContextValue>({
  isMapReady: false,
});

/**
 * Hook that returns whether the Google Map instance has finished loading.
 * Must be used within a `<MapShell>`, which renders a `MapReadyProvider`
 * automatically.
 */
export function useMapReady(): boolean {
  return useContext(MapReadyContext).isMapReady;
}

// ---------------------------------------------------------------------------
// MapShell props
// ---------------------------------------------------------------------------

export interface MapShellProps {
  /** Items to display on the map as markers. */
  items?: Item[];
  /** Travel legs to render as route polylines. */
  legs?: Leg[];
  /** Days in the trip (used for route path colouring). */
  days?: Day[];
  /** Trip metadata (for start location). */
  trip?: Trip | null;
  /** Filter markers to only these day IDs. */
  selectedDayIds?: string[];
  /** Optional externally controlled selected marker/item ID. */
  selectedItemId?: string | null;
  /** Called when map selection changes (marker click, info close). */
  onSelectedItemChange?: (itemId: string | null) => void;
  /** Callback when a marker is clicked. */
  onMarkerClick?: (itemId: string) => void;
  /** Callback when a route segment is clicked. */
  onLegClick?: (leg: Leg) => void;
  /** Callback when an auto timeline connector is clicked. */
  onConnectorClick?: (connector: TimelineConnector) => void;
  /** Callback when the user changes a leg's transport mode. */
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
  /** Derived dotted connectors between scheduled timeline items. */
  connectors?: TimelineConnector[];
  /** Whether to render legacy leg overlays. Defaults to false. */
  showLegacyLegs?: boolean;
  /** Callback when the map is clicked (for adding new places). */
  onMapClick?: (lat: number, lng: number) => void;
  /** Callback when an item-level route line is clicked. */
  onItemRouteClick?: (itemId: string) => void;
  /** Callback when a map POI is chosen to be added to the itinerary. */
  onAddPlaceToItinerary?: (place: PlaceSearchResult) => void;
  /** Callback when the user clicks "Edit" on an existing item's info window. */
  onEditItem?: (itemId: string) => void;
  /** Callback when the user clicks "Remove" on an existing item's info window. */
  onDeleteItem?: (itemId: string) => void;
  /** Broadcasts map center/zoom for collaboration follow mode. */
  onCameraChange?: (camera: PresenceMapCamera) => void;
  /** Controlled open Google POI/info-window state. */
  openLocation?: PresenceMapOpenLocation | null;
  /** Broadcasts open Google POI/info-window state for follow mode. */
  onOpenLocationChange?: (location: PresenceMapOpenLocation | null) => void;
  /** When provided, keeps the local map aligned to the followed participant. */
  followCamera?: PresenceMapCamera | null;
  /** Optional initial center; defaults to (0, 0). */
  defaultCenter?: { lat: number; lng: number };
  /** Optional initial zoom level; defaults to 2. */
  defaultZoom?: number;
  /** Additional children rendered inside the <Map> (e.g., overlays). */
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CENTER = { lat: 0, lng: 0 } as const;
const DEFAULT_ZOOM = 2;
const GOOGLE_MAPS_API_KEY: string =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const GOOGLE_MAP_LIBRARIES = ['places', 'geometry'];
const BOUNDS_PADDING = 60; // px padding when fitting bounds

function formatCoordForSignature(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : 'NaN';
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

// ---------------------------------------------------------------------------
// Inner map component that can use the useMap hook (must be inside APIProvider)
// ---------------------------------------------------------------------------

interface MapInnerProps {
  items: Item[];
  legs: Leg[];
  days: Day[];
  trip?: Trip | null;
  selectedDayIds?: string[];
  selectedItemId?: string | null;
  onSelectedItemChange?: (itemId: string | null) => void;
  onMarkerClick?: (itemId: string) => void;
  onLegClick?: (leg: Leg) => void;
  onConnectorClick?: (connector: TimelineConnector) => void;
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
  connectors: TimelineConnector[];
  showLegacyLegs: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onItemRouteClick?: (itemId: string) => void;
  onAddPlaceToItinerary?: (place: PlaceSearchResult) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onCameraChange?: (camera: PresenceMapCamera) => void;
  openLocation?: PresenceMapOpenLocation | null;
  onOpenLocationChange?: (location: PresenceMapOpenLocation | null) => void;
  followCamera?: PresenceMapCamera | null;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  colorScheme: ColorScheme;
  children?: ReactNode;
}

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

const MapInner = memo(function MapInner({
  items,
  legs,
  days,
  trip,
  selectedDayIds,
  selectedItemId,
  onSelectedItemChange,
  onMarkerClick,
  onLegClick,
  onConnectorClick,
  onModeChange,
  connectors,
  showLegacyLegs,
  onMapClick,
  onItemRouteClick,
  onAddPlaceToItinerary,
  onEditItem,
  onDeleteItem,
  onCameraChange,
  openLocation,
  onOpenLocationChange,
  followCamera,
  defaultCenter,
  defaultZoom,
  colorScheme,
  children,
}: MapInnerProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [internalSelectedItemId, setInternalSelectedItemId] = useState<string | null>(null);
  const [selectedMarkerPlace, setSelectedMarkerPlace] = useState<SelectedMarkerPlaceState | null>(null);
  const [selectedMapPlace, setSelectedMapPlace] = useState<SelectedMapPlaceState | null>(null);
  const placeLookupRequestIdRef = useRef(0);
  const markerLookupRequestIdRef = useRef(0);
  const placeDetailsCacheRef = useRef<globalThis.Map<string, PlaceSearchResult | null>>(new globalThis.Map());
  const lastAutoFitSignatureRef = useRef<string | null>(null);
  const applyingFollowCameraRef = useRef(false);
  const lastAppliedFollowCameraSignatureRef = useRef<string | null>(null);
  const followCameraAnimationFrameRef = useRef<number | null>(null);
  const followCameraTargetRef = useRef<PresenceMapCamera | null>(null);
  const followCameraTargetUpdatedAtRef = useRef(0);
  const followCameraLastTickAtRef = useRef<number | null>(null);

  const map = useMap();

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

  // -----------------------------------------------------------------------
  // Filter items by selected day IDs
  // -----------------------------------------------------------------------
  const visibleItems = useMemo(() => {
    if (!selectedDayIds || selectedDayIds.length === 0) return items;
    const daySet = new Set(selectedDayIds);
    return items.filter((item) => daySet.has(item.dayId));
  }, [items, selectedDayIds]);

  // -----------------------------------------------------------------------
  // Auto-fit bounds to show all visible markers
  // -----------------------------------------------------------------------
  const hasStartLocation = trip && (trip.startLat !== 0 || trip.startLng !== 0);

  const autoFitTargets = useMemo(() => {
    const points: { lat: number; lng: number }[] = [];
    const signatureParts: string[] = [];

    for (const item of visibleItems) {
      if (item.lat !== 0 || item.lng !== 0) {
        points.push({ lat: item.lat, lng: item.lng });
        signatureParts.push(
          `item:${item.itemId}:${formatCoordForSignature(item.lat)}:${formatCoordForSignature(item.lng)}`,
        );
      }

      if (item.scheduledStart && (item.destLat !== 0 || item.destLng !== 0)) {
        points.push({ lat: item.destLat, lng: item.destLng });
        signatureParts.push(
          `dest:${item.itemId}:${formatCoordForSignature(item.destLat)}:${formatCoordForSignature(item.destLng)}`,
        );
      }
    }

    if (hasStartLocation && trip) {
      points.push({ lat: trip.startLat, lng: trip.startLng });
      signatureParts.push(
        `start:${formatCoordForSignature(trip.startLat)}:${formatCoordForSignature(trip.startLng)}`,
      );
    }

    signatureParts.sort();

    return {
      points,
      signature: signatureParts.join('|'),
    };
  }, [hasStartLocation, trip, visibleItems]);

  useEffect(() => {
    // A recreated map instance should get one fresh fit even if the point set is unchanged.
    lastAutoFitSignatureRef.current = null;
  }, [map]);

  useEffect(() => {
    if (!map || followCamera) return;
    const { points, signature } = autoFitTargets;

    if (points.length === 0) {
      lastAutoFitSignatureRef.current = null;
      return;
    }
    if (!signature) return;
    if (lastAutoFitSignatureRef.current === signature) return;

    lastAutoFitSignatureRef.current = signature;

    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const point of points) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, BOUNDS_PADDING);
  }, [autoFitTargets, followCamera, map]);

  const cancelFollowCameraAnimation = useCallback(() => {
    if (followCameraAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(followCameraAnimationFrameRef.current);
      followCameraAnimationFrameRef.current = null;
    }
    followCameraLastTickAtRef.current = null;
  }, []);

  useEffect(() => {
    cancelFollowCameraAnimation();
    lastAppliedFollowCameraSignatureRef.current = null;
  }, [cancelFollowCameraAnimation, map]);

  useEffect(() => {
    return () => {
      cancelFollowCameraAnimation();
    };
  }, [cancelFollowCameraAnimation]);

  useEffect(() => {
    if (!followCamera) {
      cancelFollowCameraAnimation();
      followCameraTargetRef.current = null;
      lastAppliedFollowCameraSignatureRef.current = null;
      applyingFollowCameraRef.current = false;
      return;
    }
    if (!map) return;

    const signature = [
      formatCoordForSignature(followCamera.center.lat),
      formatCoordForSignature(followCamera.center.lng),
      formatCoordForSignature(followCamera.zoom),
    ].join('|');
    if (lastAppliedFollowCameraSignatureRef.current === signature) return;
    lastAppliedFollowCameraSignatureRef.current = signature;

    followCameraTargetRef.current = {
      center: { ...followCamera.center },
      zoom: followCamera.zoom,
    };
    followCameraTargetUpdatedAtRef.current = performance.now();
    applyingFollowCameraRef.current = true;
    if (followCameraAnimationFrameRef.current !== null) {
      return;
    }

    const animate = (now: number) => {
      const target = followCameraTargetRef.current;
      if (!map || !target) {
        followCameraAnimationFrameRef.current = null;
        followCameraLastTickAtRef.current = null;
        return;
      }

      const currentCenter = map.getCenter()?.toJSON() ?? target.center;
      const currentZoom = map.getZoom() ?? target.zoom;
      const deltaMs =
        followCameraLastTickAtRef.current === null
          ? 16
          : Math.min(48, Math.max(8, now - followCameraLastTickAtRef.current));
      followCameraLastTickAtRef.current = now;

      const latDelta = target.center.lat - currentCenter.lat;
      const lngDelta = target.center.lng - currentCenter.lng;
      const zoomDelta = target.zoom - currentZoom;
      const centerDistance = Math.abs(latDelta) + Math.abs(lngDelta);
      const targetWasUpdatedRecently = now - followCameraTargetUpdatedAtRef.current < 180;

      if (centerDistance < 0.00002 && Math.abs(zoomDelta) < 0.01) {
        map.moveCamera({
          center: target.center,
          zoom: target.zoom,
        });
        if (targetWasUpdatedRecently) {
          followCameraAnimationFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }

        followCameraAnimationFrameRef.current = null;
        followCameraLastTickAtRef.current = null;
        return;
      }

      const centerBlend = 1 - Math.exp(-deltaMs / 85);
      const zoomBlend = 1 - Math.exp(-deltaMs / 100);
      map.moveCamera({
        center: {
          lat: currentCenter.lat + latDelta * centerBlend,
          lng: currentCenter.lng + lngDelta * centerBlend,
        },
        zoom: currentZoom + zoomDelta * zoomBlend,
      });

      followCameraAnimationFrameRef.current = window.requestAnimationFrame(animate);
    };

    followCameraAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [cancelFollowCameraAnimation, followCamera, map]);

  const resolveOpenLocation = useCallback((nextOpenLocation: PresenceMapOpenLocation | null) => {
    placeLookupRequestIdRef.current += 1;
    const requestId = placeLookupRequestIdRef.current;

    if (!nextOpenLocation) {
      setSelectedMapPlace(null);
      return;
    }

    const fallbackPlace = buildFallbackPlace(nextOpenLocation);
    const cached =
      nextOpenLocation.placeId !== null
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
          error:
            placeDetails || fallbackPlace
              ? null
              : 'Place details are unavailable for this location.',
        });
      })
      .catch((error: unknown) => {
        if (placeLookupRequestIdRef.current !== requestId) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load place details.';
        setSelectedMapPlace({
          position: nextOpenLocation.position,
          place: fallbackPlace,
          isLoading: false,
          error: message,
        });
      });
  }, []);

  useEffect(() => {
    if (openLocation === undefined) return;
    resolveOpenLocation(openLocation);
  }, [openLocation, resolveOpenLocation]);

  // -----------------------------------------------------------------------
  // Marker click handler
  // -----------------------------------------------------------------------
  const handleMarkerClick = useCallback(
    (itemId: string) => {
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(itemId);
      onOpenLocationChange?.(null);
      onMarkerClick?.(itemId);
    },
    [onMarkerClick, onOpenLocationChange, setSelectedItem],
  );

  const handleItemRouteClick = useCallback(
    (item: Item) => {
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(null);
      onOpenLocationChange?.(null);
      onItemRouteClick?.(item.itemId);
    },
    [onItemRouteClick, onOpenLocationChange, setSelectedItem],
  );

  const handleInfoWindowClose = useCallback(() => {
    markerLookupRequestIdRef.current += 1;
    setSelectedMarkerPlace(null);
    setSelectedItem(null);
  }, [setSelectedItem]);

  const handleMapPlaceInfoClose = useCallback(() => {
    placeLookupRequestIdRef.current += 1;
    setSelectedMapPlace(null);
    onOpenLocationChange?.(null);
  }, [onOpenLocationChange]);

  const handleAddSelectedPlace = useCallback(
    (place: PlaceSearchResult) => {
      onAddPlaceToItinerary?.(place);
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      onOpenLocationChange?.(null);
    },
    [onAddPlaceToItinerary, onOpenLocationChange],
  );

  // -----------------------------------------------------------------------
  // Currently selected item (for InfoWindow)
  // -----------------------------------------------------------------------
  const selectedItem = useMemo(
    () => visibleItems.find((item) => item.itemId === effectiveSelectedItemId) ?? null,
    [effectiveSelectedItemId, visibleItems],
  );

  useEffect(() => {
    if (!selectedItem) {
      markerLookupRequestIdRef.current += 1;
      setSelectedMarkerPlace(null);
      return;
    }

    const placeId = selectedItem.placeId;
    // Skip Google API lookup for empty or synthetic place IDs (from connector-created travel items)
    const isSyntheticPlaceId = !placeId || placeId.startsWith('item-dest-') || placeId.startsWith('item-origin-') || placeId.startsWith('custom-');
    if (isSyntheticPlaceId) {
      setSelectedMarkerPlace({
        place: null,
        isLoading: false,
        error: null, // Not an error - just no Google place details available
      });
      return;
    }

    if (placeDetailsCacheRef.current.has(placeId)) {
      const cached = placeDetailsCacheRef.current.get(placeId) ?? null;
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
      .getPlaceDetails(placeId)
      .then((placeDetails) => {
        if (markerLookupRequestIdRef.current !== requestId) return;
        placeDetailsCacheRef.current.set(placeId, placeDetails);

        if (!placeDetails) {
          setSelectedMarkerPlace({
            place: null,
            isLoading: false,
            error: 'Place details are unavailable for this stop.',
          });
          return;
        }

        setSelectedMarkerPlace({
          place: placeDetails,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (markerLookupRequestIdRef.current !== requestId) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load place details.';
        setSelectedMarkerPlace({
          place: null,
          isLoading: false,
          error: message,
        });
      });
  }, [selectedItem]);

  useEscapeHotkey(selectedMapPlace !== null || selectedItem !== null, () => {
    if (selectedMapPlace) {
      handleMapPlaceInfoClose();
      return;
    }
    if (selectedItem) {
      handleInfoWindowClose();
    }
  });

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  const contextValue = useMemo<MapReadyContextValue>(
    () => ({ isMapReady }),
    [isMapReady],
  );

  const handleCameraChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      if (!isMapReady) {
        setIsMapReady(true);
      }
      if (applyingFollowCameraRef.current) return;
      onCameraChange?.({
        center: event.detail.center,
        zoom: event.detail.zoom,
      });
    },
    [isMapReady, onCameraChange],
  );

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const { latLng, placeId } = event.detail;
      if (!latLng) return;

      if (placeId) {
        // Prevent the default Google Maps POI popup so we can show our own card.
        event.stop();
        setSelectedItem(null);
        setSelectedMarkerPlace(null);

        const nextOpenLocation = {
          placeId,
          position: { lat: latLng.lat, lng: latLng.lng },
        } satisfies PresenceMapOpenLocation;
        if (openLocation !== undefined) {
          onOpenLocationChange?.(nextOpenLocation);
        } else {
          resolveOpenLocation(nextOpenLocation);
        }
        return;
      }

      // Single click on empty map: just deselect
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(null);
      onOpenLocationChange?.(null);
    },
    [onOpenLocationChange, openLocation, resolveOpenLocation, setSelectedItem],
  );

  const handleMapDblClick = useCallback(
    (event: MapMouseEvent) => {
      const { latLng } = event.detail;
      if (!latLng || !onMapClick) return;
      // Close any open info windows before opening the add dialog
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(null);
      onOpenLocationChange?.(null);
      onMapClick(latLng.lat, latLng.lng);
    },
    [onMapClick, onOpenLocationChange, setSelectedItem],
  );

  return (
    <MapReadyContext.Provider value={contextValue}>
      <div style={{ width: '100%', height: '100%' }}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="trip-planner-map"
          colorScheme={colorScheme}
          onCameraChanged={handleCameraChanged}
          onClick={handleMapClick}
          onDblclick={handleMapDblClick}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Render markers for visible items */}
          {visibleItems.map((item) => (
            <ItemMarker
              key={item.itemId}
              item={item}
              isSelected={item.itemId === effectiveSelectedItemId}
              onClick={() => handleMarkerClick(item.itemId)}
            />
          ))}

          {/* Unified info window for marker clicks */}
          {selectedItem && (
            <UnifiedInfoWindow
              position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
              item={selectedItem}
              place={selectedMarkerPlace?.place ?? null}
              isLoading={selectedMarkerPlace?.isLoading ?? false}
              error={selectedMarkerPlace?.error ?? null}
              onClose={handleInfoWindowClose}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
            />
          )}

          {/* Unified info window for POI clicks */}
          {selectedMapPlace && (
            <UnifiedInfoWindow
              position={selectedMapPlace.position}
              place={selectedMapPlace.place}
              isLoading={selectedMapPlace.isLoading}
              error={selectedMapPlace.error}
              onClose={handleMapPlaceInfoClose}
              onAddToItinerary={handleAddSelectedPlace}
            />
          )}

          {/* Start location marker */}
          {hasStartLocation && (
            <StartLocationMarker
              position={{ lat: trip.startLat, lng: trip.startLng }}
              name={trip.startName}
            />
          )}

          <ItemRouteOverlay
            items={items}
            days={days}
            selectedDayIds={selectedDayIds}
            onItemRouteClick={handleItemRouteClick}
          />

          <TimelineConnectorOverlay
            connectors={connectors}
            selectedDayIds={selectedDayIds}
            onConnectorClick={onConnectorClick}
          />

          {/* Legacy route path polylines */}
          {showLegacyLegs && legs.length > 0 && (
            <RouteOverlay
              legs={legs}
              days={days}
              items={items}
              trip={trip}
              selectedDayIds={selectedDayIds}
              onLegClick={onLegClick}
              onModeChange={onModeChange}
            />
          )}

          {children}
        </Map>
      </div>
    </MapReadyContext.Provider>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-height Google Map shell.
 *
 * Wraps `@vis.gl/react-google-maps`' `<APIProvider>` and `<Map>` with a
 * `MapReadyContext` so child components can gate logic on map readiness.
 *
 * Renders `ItemMarker` instances for each visible itinerary item and shows
 * a `UnifiedInfoWindow` when a marker or POI is clicked. Automatically fits
 * map bounds to show all visible markers.
 */
export default function MapShell({
  items = [],
  legs = [],
  days = [],
  trip,
  selectedDayIds,
  selectedItemId,
  onSelectedItemChange,
  onMarkerClick,
  onLegClick,
  onConnectorClick,
  onModeChange,
  connectors = [],
  showLegacyLegs = false,
  onMapClick,
  onItemRouteClick,
  onAddPlaceToItinerary,
  onEditItem,
  onDeleteItem,
  onCameraChange,
  openLocation,
  onOpenLocationChange,
  followCamera,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  children,
}: MapShellProps) {
  const { resolvedTheme } = useTheme();
  const colorScheme: ColorScheme = resolvedTheme === 'dark' ? 'DARK' : 'LIGHT';

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={GOOGLE_MAP_LIBRARIES}>
      <MapInner
        items={items}
        legs={legs}
        days={days}
        trip={trip}
        selectedDayIds={selectedDayIds}
        selectedItemId={selectedItemId}
        onSelectedItemChange={onSelectedItemChange}
        onMarkerClick={onMarkerClick}
        onLegClick={onLegClick}
        onConnectorClick={onConnectorClick}
        onModeChange={onModeChange}
        connectors={connectors}
        showLegacyLegs={showLegacyLegs}
        onMapClick={onMapClick}
        onItemRouteClick={onItemRouteClick}
        onAddPlaceToItinerary={onAddPlaceToItinerary}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onCameraChange={onCameraChange}
        openLocation={openLocation}
        onOpenLocationChange={onOpenLocationChange}
        followCamera={followCamera}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        colorScheme={colorScheme}
      >
        {children}
      </MapInner>
    </APIProvider>
  );
}
