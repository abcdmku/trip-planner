import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Day, Item, TransportMode } from '@/types/trip';
import { mapsRepository } from '@/services/maps-repository';
import { getMidpoint } from './route-path-utils';

interface ItemRouteOverlayProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
}

type ComputedRoute = {
  signature: string;
  routePathEncoded: string;
  distanceMeters: number;
  durationMinutes: number;
};

export interface ItemRouteOverlayState {
  visible: Item[];
  dayColorMap: Map<string, string>;
  routeMidpoints: Array<{ item: Item; midpoint: { lat: number; lng: number }; distanceMeters: number }>;
  resolveItemRouteRenderState: (item: Item) => {
    cachedRoute: ComputedRoute | null;
    encodedPath: string;
    isStraight: boolean;
  };
}

function hasCoordinates(lat: number, lng: number): boolean {
  return lat !== 0 || lng !== 0;
}

function formatCoordForSignature(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6) : 'NaN';
}

function routeSignature(item: Item): string {
  return [
    formatCoordForSignature(item.lat),
    formatCoordForSignature(item.lng),
    formatCoordForSignature(item.destLat),
    formatCoordForSignature(item.destLng),
    item.transportMode,
  ].join('|');
}

function buildItemRouteSignature(item: Item): string {
  return routeSignature(item);
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatTravelDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function estimateFlightDurationMinutes(distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;
  const cruiseSpeedKph = 850;
  const fixedGroundMinutes = 45;
  const flightMinutes = (distanceMeters / 1000 / cruiseSpeedKph) * 60;
  return Math.max(30, Math.round(flightMinutes + fixedGroundMinutes));
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

const MODE_EMOJI: Record<TransportMode, string> = {
  driving: '\u{1F697}',
  walking: '\u{1F6B6}',
  bicycling: '\u{1F6B2}',
  transit: '\u{1F68C}',
  flight: '\u{2708}\uFE0F',
  other: '\u{1F4CD}',
};

export function useItemRouteOverlayState({
  items,
  days,
  selectedDayIds,
}: ItemRouteOverlayProps): ItemRouteOverlayState {
  const dayColorMap = useMemo(() => new Map(days.map((day) => [day.dayId, day.colorHex])), [days]);
  const selectedSet = useMemo(
    () => (selectedDayIds && selectedDayIds.length > 0 ? new Set(selectedDayIds) : null),
    [selectedDayIds],
  );
  const [computedRoutes, setComputedRoutes] = useState<Record<string, ComputedRoute>>({});
  const inflightRef = useRef<Set<string>>(new Set());
  const visibleRouteSignaturesRef = useRef<Map<string, string>>(new Map());

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (!item.scheduledStart) return false;
        if (!hasCoordinates(item.lat, item.lng)) return false;
        if (!hasCoordinates(item.destLat, item.destLng)) return false;
        if (selectedSet && !selectedSet.has(item.dayId)) return false;
        return true;
      }),
    [items, selectedSet],
  );
  const resolveItemRouteRenderState = useCallback(
    (item: Item) => {
      const cachedRoute = computedRoutes[item.itemId];
      const matchingCachedRoute =
        cachedRoute && cachedRoute.signature === buildItemRouteSignature(item) ? cachedRoute : null;

      if (item.itemRouteType === 'straight') {
        return {
          cachedRoute: matchingCachedRoute,
          encodedPath: '',
          isStraight: true,
        };
      }

      return {
        cachedRoute: matchingCachedRoute,
        encodedPath: item.itemRoutePathEncoded || matchingCachedRoute?.routePathEncoded || '',
        isStraight: false,
      };
    },
    [computedRoutes],
  );

  useEffect(() => {
    visibleRouteSignaturesRef.current = new Map(
      visible.map((item) => [item.itemId, buildItemRouteSignature(item)]),
    );
  }, [visible]);

  useEffect(() => {
    setComputedRoutes((prev) => {
      let next = prev;

      for (const item of visible) {
        if (item.itemRouteType !== 'directions' || !item.itemRoutePathEncoded) continue;

        const signature = buildItemRouteSignature(item);
        const existing = prev[item.itemId];
        const matchesExisting =
          existing &&
          existing.signature === signature &&
          existing.routePathEncoded === item.itemRoutePathEncoded &&
          existing.distanceMeters === item.itemRouteDistanceMeters &&
          existing.durationMinutes === item.itemRouteDurationMinutes;

        if (matchesExisting) continue;

        if (next === prev) {
          next = { ...prev };
        }

        next[item.itemId] = {
          signature,
          routePathEncoded: item.itemRoutePathEncoded,
          distanceMeters: item.itemRouteDistanceMeters,
          durationMinutes: item.itemRouteDurationMinutes,
        };
      }

      return next;
    });
  }, [visible]);

  useEffect(() => {
    const candidates = visible.filter((item) => {
      const routeState = resolveItemRouteRenderState(item);
      if (routeState.isStraight) return false;
      if (item.transportMode === 'flight' || item.transportMode === 'other') return false;
      if (routeState.encodedPath) return false;

      const key = item.itemId;
      if (inflightRef.current.has(key)) return false;
      return true;
    });

    if (candidates.length === 0) return;

    for (const item of candidates) {
      const key = item.itemId;
      inflightRef.current.add(key);

      void mapsRepository
        .calculateLeg(
          { lat: item.lat, lng: item.lng },
          { lat: item.destLat, lng: item.destLng },
          item.transportMode,
        )
        .then((result) => {
          inflightRef.current.delete(key);
          if (!result?.routePathEncoded) return;

          const signature = routeSignature(item);
          setComputedRoutes((prev) => {
            const currentSignature = visibleRouteSignaturesRef.current.get(key);
            if (currentSignature !== signature) return prev;

            const existing = prev[key];
            if (
              existing &&
              existing.signature === signature &&
              existing.routePathEncoded === result.routePathEncoded &&
              existing.distanceMeters === result.distanceMeters &&
              existing.durationMinutes === result.durationMinutes
            ) {
              return prev;
            }

            return {
              ...prev,
              [key]: {
                signature,
                routePathEncoded: result.routePathEncoded,
                distanceMeters: result.distanceMeters,
                durationMinutes: result.durationMinutes,
              },
            };
          });
        })
        .catch(() => {
          inflightRef.current.delete(key);
        });
    }
  }, [resolveItemRouteRenderState, visible]);

  const routeMidpoints = useMemo(() => {
    return visible
      .map((item) => {
        const routeState = resolveItemRouteRenderState(item);
        const { cachedRoute, encodedPath, isStraight } = routeState;
        let midpoint: { lat: number; lng: number } | null = null;

        if (isStraight) {
          if (google.maps.geometry?.spherical) {
            const mid = google.maps.geometry.spherical.interpolate(
              new google.maps.LatLng(item.lat, item.lng),
              new google.maps.LatLng(item.destLat, item.destLng),
              0.5,
            );
            midpoint = { lat: mid.lat(), lng: mid.lng() };
          } else {
            midpoint = {
              lat: (item.lat + item.destLat) / 2,
              lng: (item.lng + item.destLng) / 2,
            };
          }
        } else if (encodedPath) {
          midpoint = getMidpoint(encodedPath);
        }

        let distanceMeters = item.itemRouteDistanceMeters;
        if (!distanceMeters && cachedRoute) {
          distanceMeters = cachedRoute.distanceMeters;
        }
        if (!distanceMeters && hasCoordinates(item.lat, item.lng) && hasCoordinates(item.destLat, item.destLng)) {
          distanceMeters = haversineDistance(
            { lat: item.lat, lng: item.lng },
            { lat: item.destLat, lng: item.destLng },
          );
        }

        return midpoint ? { item, midpoint, distanceMeters } : null;
      })
      .filter((entry): entry is { item: Item; midpoint: { lat: number; lng: number }; distanceMeters: number } => entry !== null);
  }, [resolveItemRouteRenderState, visible]);

  return {
    visible,
    dayColorMap,
    routeMidpoints: routeMidpoints.map(({ item, midpoint, distanceMeters }) => ({
      item,
      midpoint,
      distanceMeters,
    })),
    resolveItemRouteRenderState,
  };
}

export {
  buildItemRouteSignature,
  estimateFlightDurationMinutes,
  formatDistance,
  formatTravelDuration,
  MODE_EMOJI,
};
