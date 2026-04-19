import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Day, Item } from '@/types/trip';
import RoutePath from './RoutePath';
import {
  estimateFlightDurationMinutes,
  formatDistance,
  formatTravelDuration,
  MODE_EMOJI,
  useItemRouteOverlayState,
} from './useItemRouteOverlayState';

interface ItemRouteOverlayProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
  onItemRouteClick?: (item: Item) => void;
}

export default function ItemRouteOverlay({
  items,
  days,
  selectedDayIds,
  onItemRouteClick,
}: ItemRouteOverlayProps) {
  const { visible, dayColorMap, routeMidpoints, resolveItemRouteRenderState } =
    useItemRouteOverlayState({ items, days, selectedDayIds });

  return (
    <>
      {visible.map((item) => {
        const { encodedPath, isStraight } = resolveItemRouteRenderState(item);
        const color = dayColorMap.get(item.dayId) ?? '#4285F4';
        if (!isStraight && !encodedPath) return null;

        return (
          <RoutePath
            key={`item-route-${item.itemId}`}
            encodedPath={isStraight ? '' : encodedPath}
            fromLatLng={isStraight ? { lat: item.lat, lng: item.lng } : undefined}
            toLatLng={isStraight ? { lat: item.destLat, lng: item.destLng } : undefined}
            color={color}
            weight={3}
            opacity={0.7}
            onClick={onItemRouteClick ? () => onItemRouteClick(item) : undefined}
          />
        );
      })}

      {routeMidpoints.map(({ item, midpoint, distanceMeters }) => {
        const { cachedRoute } = resolveItemRouteRenderState(item);
        const color = dayColorMap.get(item.dayId) ?? '#4285F4';
        const effectiveDurationMinutes =
          item.itemRouteDurationMinutes > 0
            ? item.itemRouteDurationMinutes
            : cachedRoute && cachedRoute.durationMinutes > 0
              ? cachedRoute.durationMinutes
              : item.transportMode === 'flight'
                ? estimateFlightDurationMinutes(distanceMeters)
                : 0;
        const duration = formatTravelDuration(effectiveDurationMinutes);
        const distance = formatDistance(distanceMeters);
        const timeLabel = duration || distance;
        if (!timeLabel) return null;

        return (
          <AdvancedMarker
            key={`item-duration-${item.itemId}`}
            position={midpoint}
            zIndex={90}
            onClick={onItemRouteClick ? () => onItemRouteClick(item) : undefined}
          >
            <div
              style={{
                backgroundColor: color,
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transform: 'translateY(50%)',
                cursor: onItemRouteClick ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: '10px' }}>{MODE_EMOJI[item.transportMode]}</span>
              {timeLabel}
            </div>
          </AdvancedMarker>
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
