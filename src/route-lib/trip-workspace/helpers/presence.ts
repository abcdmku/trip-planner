import type {
  PresenceActiveTab,
  PresenceMapCamera,
  PresenceMapOpenLocation,
} from '@/types/collaboration';

export function normalizePresenceActiveTab(value: string): PresenceActiveTab {
  if (value === 'itinerary' || value === 'timeline') return value;
  return 'map';
}

export function areMapCamerasEqual(
  left: PresenceMapCamera | null | undefined,
  right: PresenceMapCamera | null | undefined,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.center.lat === right.center.lat &&
    left.center.lng === right.center.lng &&
    left.zoom === right.zoom
  );
}

export function areMapOpenLocationsEqual(
  left: PresenceMapOpenLocation | null | undefined,
  right: PresenceMapOpenLocation | null | undefined,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.placeId === right.placeId &&
    left.name === right.name &&
    left.address === right.address &&
    left.position.lat === right.position.lat &&
    left.position.lng === right.position.lng
  );
}
