import { useMemo } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Day, Item } from '@/types/trip';
import RoutePath, { getMidpoint } from './RoutePath';

interface ItemRouteOverlayProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
  onItemRouteClick?: (item: Item) => void;
}

function hasCoordinates(lat: number, lng: number): boolean {
  return lat !== 0 || lng !== 0;
}

function formatTravelDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate straight-line distance between two points in meters using Haversine formula
 */
function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
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

  // Compute midpoints and durations for ALL routes (including polylines without duration)
  const routeMidpoints = useMemo(() => {
    return visible
      .map((item) => {
        const isStraight = item.itemRouteType === 'straight' || !item.itemRoutePathEncoded;
        let midpoint: { lat: number; lng: number } | null = null;

        if (isStraight) {
          // For straight lines, compute simple midpoint
          midpoint = {
            lat: (item.lat + item.destLat) / 2,
            lng: (item.lng + item.destLng) / 2,
          };
        } else if (item.itemRoutePathEncoded) {
          // For encoded paths, use the getMidpoint helper
          midpoint = getMidpoint(item.itemRoutePathEncoded);
        }

        // Calculate distance for all routes
        let distanceMeters = item.itemRouteDistanceMeters;
        if (!distanceMeters && hasCoordinates(item.lat, item.lng) && hasCoordinates(item.destLat, item.destLng)) {
          distanceMeters = haversineDistance(
            { lat: item.lat, lng: item.lng },
            { lat: item.destLat, lng: item.destLng }
          );
        }

        return midpoint ? { item, midpoint, distanceMeters } : null;
      })
      .filter((entry): entry is { item: Item; midpoint: { lat: number; lng: number }; distanceMeters: number } => entry !== null);
  }, [visible]);

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

      {/* Duration/Distance labels at route midpoints */}
      {routeMidpoints.map(({ item, midpoint, distanceMeters }) => {
        const color = dayColorMap.get(item.dayId) ?? '#4285F4';
        const duration = formatTravelDuration(item.itemRouteDurationMinutes);
        const distance = formatDistance(distanceMeters);

        // Show duration if available, otherwise show distance
        const label = duration || distance;
        if (!label) return null;

        return (
          <AdvancedMarker
            key={`item-duration-${item.itemId}`}
            position={midpoint}
            zIndex={90}
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
              }}
            >
              {label}
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
