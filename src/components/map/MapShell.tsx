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
import ItemMarker from './ItemMarker';
import MarkerInfoWindow from './MarkerInfoWindow';
import MapPlaceInfoWindow from './MapPlaceInfoWindow';
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
  /** Callback when a map POI is chosen to be added to the itinerary. */
  onAddPlaceToItinerary?: (place: PlaceSearchResult) => void;
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
  import.meta.env.VITE_GOOGLE_API_KEY?? '';
const GOOGLE_MAP_LIBRARIES = ['places', 'geometry'];
const BOUNDS_PADDING = 60; // px padding when fitting bounds

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
  onAddPlaceToItinerary?: (place: PlaceSearchResult) => void;
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
  onAddPlaceToItinerary,
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

  useEffect(() => {
    if (!map) return;

    // Collect all points to include in bounds.
    const points: { lat: number; lng: number }[] = [];

    // Add visible items with valid coordinates.
    for (const item of visibleItems) {
      if (item.lat !== 0 || item.lng !== 0) {
        points.push({ lat: item.lat, lng: item.lng });
      }
      if (item.scheduledStart && (item.destLat !== 0 || item.destLng !== 0)) {
        points.push({ lat: item.destLat, lng: item.destLng });
      }
    }

    // Add start location if set.
    if (hasStartLocation) {
      points.push({ lat: trip.startLat, lng: trip.startLng });
    }

    if (points.length === 0) return;

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
  }, [map, visibleItems, hasStartLocation, trip]);

  // -----------------------------------------------------------------------
  // Marker click handler
  // -----------------------------------------------------------------------
  const handleMarkerClick = useCallback(
    (itemId: string) => {
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(itemId);
      onMarkerClick?.(itemId);
    },
    [onMarkerClick, setSelectedItem],
  );

  const handleInfoWindowClose = useCallback(() => {
    markerLookupRequestIdRef.current += 1;
    setSelectedMarkerPlace(null);
    setSelectedItem(null);
  }, [setSelectedItem]);

  const handleMapPlaceInfoClose = useCallback(() => {
    placeLookupRequestIdRef.current += 1;
    setSelectedMapPlace(null);
  }, []);

  const handleAddSelectedPlace = useCallback(
    (place: PlaceSearchResult) => {
      onAddPlaceToItinerary?.(place);
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
    },
    [onAddPlaceToItinerary],
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
    if (!placeId) {
      setSelectedMarkerPlace({
        place: null,
        isLoading: false,
        error: 'Place details are unavailable for this stop.',
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
    (_event: MapCameraChangedEvent) => {
      if (!isMapReady) {
        setIsMapReady(true);
      }
    },
    [isMapReady],
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

        const position = { lat: latLng.lat, lng: latLng.lng };
        if (placeDetailsCacheRef.current.has(placeId)) {
          const cached = placeDetailsCacheRef.current.get(placeId) ?? null;
          setSelectedMapPlace({
            position,
            place: cached,
            isLoading: false,
            error: cached ? null : 'Place details are unavailable for this location.',
          });
          return;
        }

        const requestId = ++placeLookupRequestIdRef.current;
        setSelectedMapPlace({
          position,
          place: null,
          isLoading: true,
          error: null,
        });

        void mapsRepository
          .getPlaceDetails(placeId)
          .then((placeDetails) => {
            if (placeLookupRequestIdRef.current !== requestId) return;
            placeDetailsCacheRef.current.set(placeId, placeDetails);

            if (!placeDetails) {
              setSelectedMapPlace({
                position,
                place: null,
                isLoading: false,
                error: 'Place details are unavailable for this location.',
              });
              return;
            }

            setSelectedMapPlace({
              position,
              place: placeDetails,
              isLoading: false,
              error: null,
            });
          })
          .catch((error: unknown) => {
            if (placeLookupRequestIdRef.current !== requestId) return;

            const message =
              error instanceof Error
                ? error.message
                : 'Failed to load place details.';
            setSelectedMapPlace({
              position,
              place: null,
              isLoading: false,
              error: message,
            });
          });
        return;
      }

      // Single click on empty map: just deselect
      placeLookupRequestIdRef.current += 1;
      setSelectedMapPlace(null);
      setSelectedMarkerPlace(null);
      setSelectedItem(null);
    },
    [setSelectedItem],
  );

  const handleMapDblClick = useCallback(
    (event: MapMouseEvent) => {
      const { latLng } = event.detail;
      if (!latLng || !onMapClick) return;
      onMapClick(latLng.lat, latLng.lng);
    },
    [onMapClick],
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

          {/* InfoWindow for selected marker */}
          {selectedItem && (
            <MarkerInfoWindow
              item={selectedItem}
              place={selectedMarkerPlace?.place ?? null}
              isLoadingPlace={selectedMarkerPlace?.isLoading ?? false}
              placeError={selectedMarkerPlace?.error ?? null}
              onClose={handleInfoWindowClose}
            />
          )}

          {selectedMapPlace && (
            <MapPlaceInfoWindow
              position={selectedMapPlace.position}
              place={selectedMapPlace.place}
              isLoading={selectedMapPlace.isLoading}
              error={selectedMapPlace.error}
              onAddToItinerary={handleAddSelectedPlace}
              onClose={handleMapPlaceInfoClose}
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
 * a `MarkerInfoWindow` when a marker is clicked. Automatically fits map
 * bounds to show all visible markers.
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
  onAddPlaceToItinerary,
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
        onAddPlaceToItinerary={onAddPlaceToItinerary}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        colorScheme={colorScheme}
      >
        {children}
      </MapInner>
    </APIProvider>
  );
}
