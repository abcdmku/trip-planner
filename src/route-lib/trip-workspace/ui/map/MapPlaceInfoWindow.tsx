import { InfoWindow } from '@vis.gl/react-google-maps';
import type { PlaceSearchResult } from '@/services/maps-repository';
import { MapInfoCard } from '@/component-lib/map/MapInfoCard';

interface MapPlaceInfoWindowProps {
  position: { lat: number; lng: number };
  place: PlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
  onAddToItinerary: (place: PlaceSearchResult) => void;
  onClose: () => void;
}

export default function MapPlaceInfoWindow({
  position,
  place,
  isLoading,
  error,
  onAddToItinerary,
  onClose,
}: MapPlaceInfoWindowProps) {
  return (
    <InfoWindow
      position={position}
      onCloseClick={onClose}
      headerDisabled
      className="tp-map-info-window"
      pixelOffset={[0, -35]}
    >
      <MapInfoCard
        item={null}
        place={place}
        isLoading={isLoading}
        error={error}
        onClose={onClose}
        onAddToItinerary={onAddToItinerary}
      />
    </InfoWindow>
  );
}
