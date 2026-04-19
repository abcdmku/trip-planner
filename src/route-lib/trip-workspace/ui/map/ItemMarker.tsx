import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Item } from '@/types/trip';
import { ItemMarkerPin } from '@/component-lib/map/ItemMarkerPin';

export interface ItemMarkerProps {
  item: Item;
  isSelected?: boolean;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItemMarker({ item, isSelected = false, onClick }: ItemMarkerProps) {
  return (
    <AdvancedMarker
      position={{ lat: item.lat, lng: item.lng }}
      title={item.placeName}
      onClick={onClick}
      zIndex={isSelected ? 100 : undefined}
    >
      <ItemMarkerPin itemType={item.type} isSelected={isSelected} />
    </AdvancedMarker>
  );
}
