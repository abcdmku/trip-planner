import { useCallback, useRef, useState } from 'react';
import { mapsRepository } from '@/services/maps-repository';
import type { RouteType, TransportMode } from '@/types/trip';

export interface RouteCalculationPoint {
  lat: number;
  lng: number;
}

export interface CalculatedRoute {
  itemRoutePathEncoded: string;
  itemRouteDistanceMeters: number;
  itemRouteDurationMinutes: number;
}

interface UseRouteCalculationOptions {
  origin: RouteCalculationPoint | null;
  destination: RouteCalculationPoint | null;
  transportMode: TransportMode;
  routeType: RouteType;
  onCalculated?: (route: CalculatedRoute) => void;
}

export function useRouteCalculation({
  origin,
  destination,
  transportMode,
  routeType,
  onCalculated,
}: UseRouteCalculationOptions) {
  const [calculatedRoute, setCalculatedRoute] = useState<CalculatedRoute | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const calculationRequestRef = useRef(0);

  const clearCalculatedRoute = useCallback(() => {
    setCalculatedRoute(null);
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination || routeType !== 'directions') return null;

    const requestId = ++calculationRequestRef.current;
    setIsCalculatingRoute(true);

    try {
      const result = await mapsRepository.calculateLeg(origin, destination, transportMode);

      if (requestId !== calculationRequestRef.current) return null;

      if (result) {
        const next = {
          itemRoutePathEncoded: result.routePathEncoded,
          itemRouteDistanceMeters: result.distanceMeters,
          itemRouteDurationMinutes: result.durationMinutes,
        };
        setCalculatedRoute(next);
        onCalculated?.(next);
        return next;
      }

      const straight = mapsRepository.calculateStraightLeg(origin, destination);
      const next = {
        itemRoutePathEncoded: '',
        itemRouteDistanceMeters: straight.distanceMeters,
        itemRouteDurationMinutes: straight.durationMinutes,
      };
      setCalculatedRoute(next);
      onCalculated?.(next);
      return next;
    } catch (error) {
      console.error('Failed to calculate route:', error);
      return null;
    } finally {
      if (requestId === calculationRequestRef.current) {
        setIsCalculatingRoute(false);
      }
    }
  }, [destination, onCalculated, origin, routeType, transportMode]);

  return {
    calculatedRoute,
    isCalculatingRoute,
    calculateRoute,
    clearCalculatedRoute,
    setCalculatedRoute,
  };
}
