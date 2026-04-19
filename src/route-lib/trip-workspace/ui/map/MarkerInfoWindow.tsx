import { InfoWindow } from '@vis.gl/react-google-maps';
import type { Item } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';
import { MapInfoCard } from '@/component-lib/map/MapInfoCard';

export interface MarkerInfoWindowProps {
  item: Item;
  place: PlaceSearchResult | null;
  isLoadingPlace: boolean;
  placeError: string | null;
  onClose: () => void;
}

export default function MarkerInfoWindow({
  item,
  place,
  isLoadingPlace,
  placeError,
  onClose,
}: MarkerInfoWindowProps) {
  return (
    <InfoWindow
      position={{ lat: item.lat, lng: item.lng }}
      onCloseClick={onClose}
      headerDisabled
      className="tp-map-info-window"
      pixelOffset={[0, -40]}
    >
      <MapInfoCard
        item={item}
        place={place}
        isLoading={isLoadingPlace}
        error={placeError}
        onClose={onClose}
      />
    </InfoWindow>
  );
}
