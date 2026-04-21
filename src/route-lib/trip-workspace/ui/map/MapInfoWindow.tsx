import { InfoWindow } from '@vis.gl/react-google-maps';
import { MapInfoCard, type MapInfoCardProps } from '@/component-lib/map/MapInfoCard';

export interface MapInfoWindowProps extends MapInfoCardProps {
  position: { lat: number; lng: number };
}

export default function MapInfoWindow({
  position,
  item,
  displayItem,
  day,
  place,
  isLoading,
  error,
  onClose,
  onAddToItinerary,
  onEditItem,
  onDeleteItem,
}: MapInfoWindowProps) {
  return (
    <InfoWindow
      position={position}
      onCloseClick={onClose}
      headerDisabled
      className="tp-map-info-window"
      pixelOffset={[0, -40]}
    >
      <MapInfoCard
        item={item}
        displayItem={displayItem}
        day={day}
        place={place}
        isLoading={isLoading}
        error={error}
        onClose={onClose}
        onAddToItinerary={onAddToItinerary}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
      />
    </InfoWindow>
  );
}
