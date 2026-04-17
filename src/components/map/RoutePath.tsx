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
  /** Start point for straight-line rendering (when encodedPath is empty). */
  fromLatLng?: { lat: number; lng: number };
  /** End point for straight-line rendering (when encodedPath is empty). */
  toLatLng?: { lat: number; lng: number };
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

function brightenColor(color: string, amount = 0.25): string {
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return color;

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  const mixToWhite = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount)));
  const toHex = (channel: number) => mixToWhite(channel).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  fromLatLng,
  toLatLng,
}: RoutePathProps) {
  const map = useMap();
  const bgPolylineRef = useRef<google.maps.Polyline | null>(null);
  const fgPolylineRef = useRef<google.maps.Polyline | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mouseOverListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mouseOutListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // Determine if this is a straight-line (2-point geodesic) leg.
  const isStraightLine = !encodedPath && fromLatLng !== undefined && toLatLng !== undefined;

  useEffect(() => {
    if (!map) return;

    // Need either an encoded path or from/to coords for straight-line.
    if (!encodedPath && !isStraightLine) return;

    let pathToRender: google.maps.LatLng[];

    if (isStraightLine) {
      const from = fromLatLng!;
      const to = toLatLng!;
      pathToRender = [
        new google.maps.LatLng(from.lat, from.lng),
        new google.maps.LatLng(to.lat, to.lng),
      ];
    } else {
      if (!google.maps.geometry?.encoding) {
        console.warn('RoutePath: google.maps.geometry.encoding is not available');
        return;
      }
      const decodedPath = google.maps.geometry.encoding.decodePath(encodedPath);
      pathToRender = trimPath(decodedPath, trimMeters);
    }

    // Dashed line symbol for straight-line legs.
  const dashSymbol: google.maps.Symbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      strokeWeight: weight,
      scale: weight,
      strokeColor: color,
    };
    const straightHitWeight = Math.max(weight * 3, 14);
    const hoverColor = brightenColor(color, 0.3);
    const geodesic = isStraightLine;

    const applyVisualState = (hovered: boolean) => {
      const displayColor = hovered ? hoverColor : color;

      if (bgPolylineRef.current) {
        bgPolylineRef.current.setOptions({
          strokeColor: displayColor,
          strokeWeight: isStraightLine ? 0 : weight + 3,
          strokeOpacity: isStraightLine ? 0 : opacity * 0.25,
          geodesic,
        });
      }

      if (!fgPolylineRef.current) return;
      if (isStraightLine) {
        fgPolylineRef.current.setOptions({
          strokeColor: displayColor,
          // Invisible, but wide enough to receive mouse events for dashed lines.
          strokeWeight: straightHitWeight,
          strokeOpacity: 0,
          geodesic,
          icons: [{
            icon: {
              ...dashSymbol,
              strokeColor: displayColor,
            },
            offset: '0',
            repeat: `${weight * 4}px`,
          }],
        });
      } else {
        fgPolylineRef.current.setOptions({
          strokeColor: displayColor,
          strokeWeight: weight,
          strokeOpacity: opacity,
          geodesic,
          icons: [],
        });
      }
    };

    // --- Background (wider, semi-transparent) polyline for depth ---
    if (bgPolylineRef.current) {
      bgPolylineRef.current.setPath(pathToRender);
      bgPolylineRef.current.setOptions({
        strokeColor: color,
        strokeWeight: isStraightLine ? 0 : weight + 3,
        strokeOpacity: isStraightLine ? 0 : opacity * 0.25,
        geodesic,
        clickable: Boolean(onClick),
      });
    } else {
      bgPolylineRef.current = new google.maps.Polyline({
        path: pathToRender,
        strokeColor: color,
        strokeWeight: isStraightLine ? 0 : weight + 3,
        strokeOpacity: isStraightLine ? 0 : opacity * 0.25,
        geodesic,
        map,
        zIndex: 1,
        clickable: Boolean(onClick),
      });
    }

    // --- Foreground polyline ---
    if (fgPolylineRef.current) {
      fgPolylineRef.current.setPath(pathToRender);
      if (isStraightLine) {
        fgPolylineRef.current.setOptions({
          strokeColor: color,
          strokeWeight: straightHitWeight,
          strokeOpacity: 0,
          geodesic,
          clickable: Boolean(onClick),
          icons: [{
            icon: dashSymbol,
            offset: '0',
            repeat: `${weight * 4}px`,
          }],
        });
      } else {
        fgPolylineRef.current.setOptions({
          strokeColor: color,
          strokeWeight: weight,
          strokeOpacity: opacity,
          geodesic,
          clickable: Boolean(onClick),
          icons: [],
        });
      }
    } else {
      fgPolylineRef.current = new google.maps.Polyline({
        path: pathToRender,
        strokeColor: color,
        strokeWeight: isStraightLine ? straightHitWeight : weight,
        strokeOpacity: isStraightLine ? 0 : opacity,
        geodesic,
        map,
        zIndex: 2,
        clickable: Boolean(onClick),
        ...(isStraightLine && {
          icons: [{
            icon: dashSymbol,
            offset: '0',
            repeat: `${weight * 4}px`,
          }],
        }),
      });
    }

    // Click listener on the foreground polyline.
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    if (mouseOverListenerRef.current) {
      google.maps.event.removeListener(mouseOverListenerRef.current);
      mouseOverListenerRef.current = null;
    }
    if (mouseOutListenerRef.current) {
      google.maps.event.removeListener(mouseOutListenerRef.current);
      mouseOutListenerRef.current = null;
    }
    if (onClick) {
      clickListenerRef.current = fgPolylineRef.current.addListener('click', (event: google.maps.MapMouseEvent | google.maps.PolyMouseEvent) => {
        // Prevent map click handler from immediately clearing selection.
        if ('stop' in event && typeof event.stop === 'function') {
          event.stop();
        }
        const domEvent = (event as { domEvent?: { stopPropagation?: () => void; preventDefault?: () => void } }).domEvent;
        domEvent?.stopPropagation?.();
        domEvent?.preventDefault?.();
        onClick();
      });
      mouseOverListenerRef.current = fgPolylineRef.current.addListener('mouseover', () => {
        const mapDiv = map.getDiv();
        mapDiv.style.cursor = 'pointer';
        applyVisualState(true);
      });
      mouseOutListenerRef.current = fgPolylineRef.current.addListener('mouseout', () => {
        const mapDiv = map.getDiv();
        mapDiv.style.cursor = '';
        applyVisualState(false);
      });
    } else {
      applyVisualState(false);
    }

    return () => {
      map.getDiv().style.cursor = '';
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      if (mouseOverListenerRef.current) {
        google.maps.event.removeListener(mouseOverListenerRef.current);
        mouseOverListenerRef.current = null;
      }
      if (mouseOutListenerRef.current) {
        google.maps.event.removeListener(mouseOutListenerRef.current);
        mouseOutListenerRef.current = null;
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
  }, [map, encodedPath, color, weight, opacity, trimMeters, onClick, isStraightLine, fromLatLng, toLatLng]);

  return null;
}
