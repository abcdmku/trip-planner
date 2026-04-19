import { useEffect, useMemo, useRef } from 'react';
import type { Item, Trip } from '@/types/trip';
import type { PresenceMapCamera } from '@/types/collaboration';

const BOUNDS_PADDING = 60;

function formatCoord(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : 'NaN';
}

export function useMapAutoFit({
  map,
  visibleItems,
  trip,
  followCamera,
}: {
  map: google.maps.Map | null;
  visibleItems: Item[];
  trip?: Trip | null;
  followCamera?: PresenceMapCamera | null;
}) {
  const lastAutoFitSignatureRef = useRef<string | null>(null);
  const hasStartLocation = Boolean(trip && (trip.startLat !== 0 || trip.startLng !== 0));

  const autoFitTargets = useMemo(() => {
    const points: { lat: number; lng: number }[] = [];
    const signatureParts: string[] = [];

    for (const item of visibleItems) {
      if (item.lat !== 0 || item.lng !== 0) {
        points.push({ lat: item.lat, lng: item.lng });
        signatureParts.push(`item:${item.itemId}:${formatCoord(item.lat)}:${formatCoord(item.lng)}`);
      }

      if (item.scheduledStart && (item.destLat !== 0 || item.destLng !== 0)) {
        points.push({ lat: item.destLat, lng: item.destLng });
        signatureParts.push(`dest:${item.itemId}:${formatCoord(item.destLat)}:${formatCoord(item.destLng)}`);
      }
    }

    if (hasStartLocation && trip) {
      points.push({ lat: trip.startLat, lng: trip.startLng });
      signatureParts.push(`start:${formatCoord(trip.startLat)}:${formatCoord(trip.startLng)}`);
    }

    signatureParts.sort();

    return {
      points,
      signature: signatureParts.join('|'),
    };
  }, [hasStartLocation, trip, visibleItems]);

  useEffect(() => {
    lastAutoFitSignatureRef.current = null;
  }, [map]);

  useEffect(() => {
    if (!map || followCamera) return;
    const { points, signature } = autoFitTargets;

    if (points.length === 0) {
      lastAutoFitSignatureRef.current = null;
      return;
    }
    if (!signature || lastAutoFitSignatureRef.current === signature) return;

    lastAutoFitSignatureRef.current = signature;

    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const point of points) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, BOUNDS_PADDING);
  }, [autoFitTargets, followCamera, map]);
}
