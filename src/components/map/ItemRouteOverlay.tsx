import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Day, Item } from '@/types/trip';
import RoutePath from './RoutePath';

interface ItemRouteOverlayProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
  onItemRouteClick?: (item: Item) => void;
}

function hasCoordinates(lat: number, lng: number): boolean {
  return lat !== 0 || lng !== 0;
}

export default function ItemRouteOverlay({
  items,
  days,
  selectedDayIds,
  onItemRouteClick,
}: ItemRouteOverlayProps) {
  const dayColorMap = new Map(days.map((day) => [day.dayId, day.colorHex]));
  const selectedSet = selectedDayIds && selectedDayIds.length > 0 ? new Set(selectedDayIds) : null;

  const visible = items.filter((item) => {
    if (!item.scheduledStart) return false;
    if (!hasCoordinates(item.lat, item.lng)) return false;
    if (!hasCoordinates(item.destLat, item.destLng)) return false;
    if (selectedSet && !selectedSet.has(item.dayId)) return false;
    return true;
  });

  return (
    <>
      {visible.map((item) => {
        const color = dayColorMap.get(item.dayId) ?? '#4285F4';
        const isStraight = item.itemRouteType === 'straight' || !item.itemRoutePathEncoded;
        return (
          <RoutePath
            key={`item-route-${item.itemId}`}
            encodedPath={isStraight ? '' : item.itemRoutePathEncoded}
            fromLatLng={isStraight ? { lat: item.lat, lng: item.lng } : undefined}
            toLatLng={isStraight ? { lat: item.destLat, lng: item.destLng } : undefined}
            color={color}
            weight={3}
            opacity={0.7}
            onClick={onItemRouteClick ? () => onItemRouteClick(item) : undefined}
          />
        );
      })}

      {visible.map((item) => (
        <AdvancedMarker
          key={`item-destination-${item.itemId}`}
          position={{ lat: item.destLat, lng: item.destLng }}
          title={`${item.placeName} destination`}
          zIndex={80}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '9999px',
              border: '2px solid #fff',
              backgroundColor: dayColorMap.get(item.dayId) ?? '#4285F4',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
            }}
          />
        </AdvancedMarker>
      ))}
    </>
  );
}
