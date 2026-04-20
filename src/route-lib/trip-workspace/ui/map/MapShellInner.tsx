import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Map, useMap, type ColorScheme, type MapCameraChangedEvent, type MapMouseEvent } from '@vis.gl/react-google-maps';
import type { Day, Item, Leg, Trip, TransportMode } from '@/types/trip';
import type { PresenceMapCamera, PresenceMapOpenLocation } from '@/types/collaboration';
import type { TimelineConnector } from '@/lib/connectors';
import type { PlaceSearchResult } from '@/services/maps-repository';
import ItemMarker from './ItemMarker';
import UnifiedInfoWindow from './UnifiedInfoWindow';
import RouteOverlay from './RouteOverlay';
import StartLocationMarker from './StartLocationMarker';
import ItemRouteOverlay from './ItemRouteOverlay';
import TimelineConnectorOverlay from './TimelineConnectorOverlay';
import { useMapAutoFit } from './useMapAutoFit';
import { useMapSelectionState } from './useMapSelectionState';

interface MapShellInnerProps {
  items?: Item[];
  legs?: Leg[];
  days?: Day[];
  trip?: Trip | null;
  selectedDay?: Day | null;
  displayItemsById?: Map<string, Item>;
  selectedDayIds?: string[];
  selectedItemId?: string | null;
  onSelectedItemChange?: (itemId: string | null) => void;
  onMarkerClick?: (itemId: string) => void;
  onLegClick?: (leg: Leg) => void;
  onConnectorClick?: (connector: TimelineConnector) => void;
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
  connectors?: TimelineConnector[];
  showLegacyLegs?: boolean;
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
  onMapReadyChange?: (isReady: boolean) => void;
}

const MapInner = memo(function MapInner({
  items = [],
  legs = [],
  days = [],
  trip,
  selectedDay,
  displayItemsById,
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
  defaultCenter,
  defaultZoom,
  colorScheme,
  children,
  onMapReadyChange,
}: MapShellInnerProps) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);

  const visibleItems = useMemo(() => {
    if (!selectedDayIds || selectedDayIds.length === 0) return items;
    const daySet = new Set(selectedDayIds);
    return items.filter((item) => daySet.has(item.dayId));
  }, [items, selectedDayIds]);

  useMapAutoFit({ map, visibleItems, trip, followCamera });

  const {
    selectedItem,
    selectedMarkerPlace,
    selectedMapPlace,
    effectiveSelectedItemId,
    handleMarkerClick,
    handleItemRouteClick,
    handleInfoWindowClose,
    handleMapPlaceInfoClose,
    handleAddSelectedPlace,
    resolveOpenLocation,
  } = useMapSelectionState({
    visibleItems,
    selectedItemId,
    onSelectedItemChange,
    onMarkerClick,
    onItemRouteClick,
    onAddPlaceToItinerary,
    openLocation,
    onOpenLocationChange,
  });

  const handleCameraChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      if (!mapReady) {
        setMapReady(true);
        onMapReadyChange?.(true);
      }
      if (followCamera) return;
      onCameraChange?.({
        center: event.detail.center,
        zoom: event.detail.zoom,
      });
    },
    [followCamera, mapReady, onCameraChange, onMapReadyChange],
  );

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const { latLng, placeId } = event.detail;
      if (!latLng) return;

      if (placeId) {
        event.stop();
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

      handleInfoWindowClose();
      handleMapPlaceInfoClose();
    },
    [handleInfoWindowClose, handleMapPlaceInfoClose, onOpenLocationChange, openLocation, resolveOpenLocation],
  );

  const handleMapDblClick = useCallback(
    (event: MapMouseEvent) => {
      const { latLng } = event.detail;
      if (!latLng || !onMapClick) return;
      handleInfoWindowClose();
      handleMapPlaceInfoClose();
      onMapClick(latLng.lat, latLng.lng);
    },
    [handleInfoWindowClose, handleMapPlaceInfoClose, onMapClick],
  );

  const hasStartLocation = Boolean(trip && (trip.startLat !== 0 || trip.startLng !== 0));

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        center={followCamera?.center}
        zoom={followCamera?.zoom}
        controlled={Boolean(followCamera)}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="trip-planner-map"
        colorScheme={colorScheme}
        onCameraChanged={handleCameraChanged}
        onClick={handleMapClick}
        onDblclick={handleMapDblClick}
        style={{ width: '100%', height: '100%' }}
      >
        {visibleItems.map((item) => (
          <ItemMarker
            key={item.itemId}
            item={item}
            isSelected={item.itemId === effectiveSelectedItemId}
            onClick={() => handleMarkerClick(item.itemId)}
          />
        ))}

        {selectedItem && (
          <UnifiedInfoWindow
            position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
            item={selectedItem}
            displayItem={displayItemsById?.get(selectedItem.itemId) ?? null}
            day={selectedDay}
            place={selectedMarkerPlace?.place ?? null}
            isLoading={selectedMarkerPlace?.isLoading ?? false}
            error={selectedMarkerPlace?.error ?? null}
            onClose={handleInfoWindowClose}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
          />
        )}

        {selectedMapPlace && (
          <UnifiedInfoWindow
            position={selectedMapPlace.position}
            day={selectedDay}
            place={selectedMapPlace.place}
            isLoading={selectedMapPlace.isLoading}
            error={selectedMapPlace.error}
            onClose={handleMapPlaceInfoClose}
            onAddToItinerary={handleAddSelectedPlace}
          />
        )}

        {hasStartLocation && trip && (
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
  );
});

export default MapInner;
