import { useMemo, useState, type ReactNode } from 'react';
import { APIProvider, type ColorScheme } from '@vis.gl/react-google-maps';
import type { Day, Item, Leg, Trip, TransportMode } from '@/types/trip';
import { useTheme } from '@/hooks/useTheme';
import type { PresenceMapCamera, PresenceMapOpenLocation } from '@/types/collaboration';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { TimelineConnector } from '@/lib/connectors';
import { MapReadyContext } from './MapReadyContext';
import MapShellInner from './MapShellInner';

export interface MapShellProps {
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
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  children?: ReactNode;
}

const DEFAULT_CENTER = { lat: 0, lng: 0 } as const;
const DEFAULT_ZOOM = 2;
const GOOGLE_MAPS_API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const GOOGLE_MAP_LIBRARIES = ['places', 'geometry'];

export default function MapShell({
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
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  children,
}: MapShellProps) {
  const { resolvedTheme } = useTheme();
  const colorScheme: ColorScheme = resolvedTheme === 'dark' ? 'DARK' : 'LIGHT';
  const [isMapReady, setIsMapReady] = useState(false);
  const contextValue = useMemo(() => ({ isMapReady }), [isMapReady]);

  return (
    <MapReadyContext.Provider value={contextValue}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={GOOGLE_MAP_LIBRARIES}>
        <MapShellInner
          items={items}
          legs={legs}
          days={days}
          trip={trip}
          selectedDay={selectedDay}
          displayItemsById={displayItemsById}
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
          onMapReadyChange={setIsMapReady}
        >
          {children}
        </MapShellInner>
      </APIProvider>
    </MapReadyContext.Provider>
  );
}
