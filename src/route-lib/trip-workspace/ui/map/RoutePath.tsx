// ---------------------------------------------------------------------------
// RoutePath – Renders a decoded polyline on the Google Map with optional
// gap-trimming near endpoints and a dual-stroke visual effect.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { brightenColor, trimPath } from './route-path-utils';

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
