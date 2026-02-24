import type { TransportMode } from '@/types/trip';

type GoogleMapsTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export function toGoogleMapsTravelMode(
  mode: TransportMode | undefined,
): GoogleMapsTravelMode | null {
  switch (mode) {
    case 'driving':
    case 'walking':
    case 'bicycling':
    case 'transit':
      return mode;
    case 'flight':
    case 'other':
    default:
      return null;
  }
}

export function buildGoogleMapsDirectionsUrl({
  origin,
  destination,
  mode,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode?: TransportMode;
}): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
  });

  const travelMode = toGoogleMapsTravelMode(mode);
  if (travelMode) {
    params.set('travelmode', travelMode);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

