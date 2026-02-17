// ---------------------------------------------------------------------------
// RoutePath – Renders a decoded polyline on the Google Map with optional
// gap-trimming near endpoints and a dual-stroke visual effect.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RoutePathProps {
  /** Encoded polyline string from the Directions API. */
  encodedPath: string;
  /** Stroke colour (CSS colour string). Defaults to "#4285F4" (Google blue). */
  color?: string;
  /** Stroke weight in pixels. Defaults to 4. */
  weight?: number;
  /** Stroke opacity (0-1). Defaults to 0.7. */
  opacity?: number;
  /** Metres to trim from each end of the polyline (gap near markers). */
  trimMeters?: number;
  /** Optional click handler for the polyline. */
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Trim `meters` from both ends of a path using the geometry library.
 * Returns the trimmed path, or the original if it's too short to trim.
 */
function trimPath(
  path: google.maps.LatLng[],
  meters: number,
): google.maps.LatLng[] {
  if (path.length < 2 || meters <= 0) return path;

  const spherical = google.maps.geometry.spherical;

  // Accumulate distances along the path.
  const distances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    distances.push(
      distances[i - 1] + spherical.computeDistanceBetween(path[i - 1], path[i]),
    );
  }

  const totalLength = distances[distances.length - 1];
  if (totalLength <= meters * 2.5) return path; // Too short to trim meaningfully

  const startTrim = meters;
  const endTrim = totalLength - meters;

  const trimmed: google.maps.LatLng[] = [];

  for (let i = 0; i < path.length; i++) {
    const d = distances[i];

    // Find the interpolated start point
    if (trimmed.length === 0 && i > 0 && distances[i - 1] < startTrim && d >= startTrim) {
      const segLen = d - distances[i - 1];
      const fraction = segLen > 0 ? (startTrim - distances[i - 1]) / segLen : 0;
      trimmed.push(
        google.maps.geometry.spherical.interpolate(path[i - 1], path[i], fraction),
      );
    }

    if (d >= startTrim && d <= endTrim) {
      trimmed.push(path[i]);
    }

    // Find the interpolated end point
    if (i > 0 && distances[i - 1] <= endTrim && d > endTrim) {
      const segLen = d - distances[i - 1];
      const fraction = segLen > 0 ? (endTrim - distances[i - 1]) / segLen : 0;
      trimmed.push(
        google.maps.geometry.spherical.interpolate(path[i - 1], path[i], fraction),
      );
      break;
    }
  }

  return trimmed.length >= 2 ? trimmed : path;
}

/**
 * Returns the midpoint of an encoded polyline path (by distance along it).
 */
export function getMidpoint(
  encodedPath: string,
): { lat: number; lng: number } | null {
  if (!google.maps.geometry?.encoding) return null;

  const path = google.maps.geometry.encoding.decodePath(encodedPath);
  if (path.length === 0) return null;
  if (path.length === 1) return { lat: path[0].lat(), lng: path[0].lng() };

  const spherical = google.maps.geometry.spherical;

  // Accumulate total length
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    totalLength += spherical.computeDistanceBetween(path[i - 1], path[i]);
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 1; i < path.length; i++) {
    const segLen = spherical.computeDistanceBetween(path[i - 1], path[i]);
    if (accumulated + segLen >= halfLength) {
      const fraction = segLen > 0 ? (halfLength - accumulated) / segLen : 0;
      const mid = spherical.interpolate(path[i - 1], path[i], fraction);
      return { lat: mid.lat(), lng: mid.lng() };
    }
    accumulated += segLen;
  }

  // Fallback: last point
  const last = path[path.length - 1];
  return { lat: last.lat(), lng: last.lng() };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoutePath({
  encodedPath,
  color = '#4285F4',
  weight = 4,
  opacity = 0.7,
  trimMeters = 60,
  onClick,
}: RoutePathProps) {
  const map = useMap();
  const bgPolylineRef = useRef<google.maps.Polyline | null>(null);
  const fgPolylineRef = useRef<google.maps.Polyline | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    if (!map || !encodedPath) return;

    if (!google.maps.geometry?.encoding) {
      console.warn('RoutePath: google.maps.geometry.encoding is not available');
      return;
    }

    const decodedPath = google.maps.geometry.encoding.decodePath(encodedPath);
    const trimmedPath = trimPath(decodedPath, trimMeters);

    // --- Background (wider, semi-transparent) polyline for depth ---
    if (bgPolylineRef.current) {
      bgPolylineRef.current.setPath(trimmedPath);
      bgPolylineRef.current.setOptions({
        strokeColor: color,
        strokeWeight: weight + 3,
        strokeOpacity: opacity * 0.25,
      });
    } else {
      bgPolylineRef.current = new google.maps.Polyline({
        path: trimmedPath,
        strokeColor: color,
        strokeWeight: weight + 3,
        strokeOpacity: opacity * 0.25,
        geodesic: true,
        map,
        zIndex: 1,
      });
    }

    // --- Foreground polyline ---
    if (fgPolylineRef.current) {
      fgPolylineRef.current.setPath(trimmedPath);
      fgPolylineRef.current.setOptions({
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
      });
    } else {
      fgPolylineRef.current = new google.maps.Polyline({
        path: trimmedPath,
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
        geodesic: true,
        map,
        zIndex: 2,
      });
    }

    // Click listener on the foreground polyline.
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
      listenerRef.current = null;
    }
    if (onClick) {
      listenerRef.current = fgPolylineRef.current.addListener('click', onClick);
    }

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (bgPolylineRef.current) {
        bgPolylineRef.current.setMap(null);
        bgPolylineRef.current = null;
      }
      if (fgPolylineRef.current) {
        fgPolylineRef.current.setMap(null);
        fgPolylineRef.current = null;
      }
    };
  }, [map, encodedPath, color, weight, opacity, trimMeters, onClick]);

  return null;
}
