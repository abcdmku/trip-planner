import { useCallback, useMemo, useState } from 'react';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';
import type { RouteType, TransportMode } from '@/types/trip';
import type { EventEditorValue } from './EventEditorForm';
import {
  useRouteCalculation,
  type CalculatedRoute,
  type RouteCalculationPoint,
} from './useRouteCalculation';

interface UseItemRouteEditorStateOptions {
  origin: RouteCalculationPoint | null;
  destination: RouteCalculationPoint | null;
  transportMode: TransportMode;
  itemRouteType: RouteType;
  itemType: EventEditorValue['type'];
  existingRouteDurationMinutes?: number;
  hasPersistedRoute?: boolean;
  initialRouteOpen?: boolean;
  onCalculated?: (route: CalculatedRoute) => void;
}

export interface ItemRouteEditorState {
  calculatedRoute: CalculatedRoute | null;
  isCalculatingRoute: boolean;
  isRouteOpen: boolean;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  openInGoogleMapsUrl?: string;
  routeBadge: string;
  displayedRouteDurationMinutes: number;
  hasCalculatedRoute: boolean;
  showTravelControls: boolean;
  canCalculateRoute: boolean;
  handleRouteToggle: () => void;
  handleOriginEditStart: () => void;
  handleOriginEditCancel: () => void;
  handleDestinationEditStart: () => void;
  handleDestinationEditCancel: () => void;
  handleCalculateRoute: () => Promise<CalculatedRoute | null>;
  clearCalculatedRoute: () => void;
  resetUiState: () => void;
}

export function applyCalculatedRouteToEditorValue(
  editor: EventEditorValue,
  route: CalculatedRoute,
): EventEditorValue {
  if (route.itemRouteDurationMinutes <= 0) return editor;

  let nextDuration = route.itemRouteDurationMinutes;
  const next: EventEditorValue = { ...editor, durationMinutes: nextDuration };

  if (!editor.scheduledStart) {
    return next;
  }

  const [startHour, startMinute] = editor.scheduledStart.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const maxDuration = Math.max(0, 23 * 60 + 59 - startTotalMinutes);
  nextDuration = Math.min(nextDuration, maxDuration);
  next.durationMinutes = nextDuration;

  const endTotalMinutes = startTotalMinutes + nextDuration;
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMinute = endTotalMinutes % 60;
  next.scheduledEnd = `${endHour.toString().padStart(2, '0')}:${endMinute
    .toString()
    .padStart(2, '0')}`;

  return next;
}

export function emptyRouteMetadata() {
  return {
    itemRoutePathEncoded: '',
    itemRouteDistanceMeters: 0,
    itemRouteDurationMinutes: 0,
  } satisfies CalculatedRoute;
}

function transportModeLabel(mode: TransportMode): string {
  switch (mode) {
    case 'driving':
      return 'Drive';
    case 'walking':
      return 'Walk';
    case 'bicycling':
      return 'Bike';
    case 'transit':
      return 'Transit';
    case 'flight':
      return 'Flight';
    default:
      return 'Other';
  }
}

function formatRouteBadge(
  transportMode: TransportMode,
  itemRouteType: RouteType,
  durationMinutes: number,
): string {
  const modeLabel = transportModeLabel(transportMode);
  const routeLabel = itemRouteType === 'directions' ? 'Routed' : 'Straight';
  return durationMinutes > 0
    ? `${modeLabel} / ${routeLabel} / ${durationMinutes}m`
    : `${modeLabel} / ${routeLabel}`;
}

export function useItemRouteEditorState({
  origin,
  destination,
  transportMode,
  itemRouteType,
  itemType,
  existingRouteDurationMinutes = 0,
  hasPersistedRoute = false,
  initialRouteOpen = true,
  onCalculated,
}: UseItemRouteEditorStateOptions): ItemRouteEditorState {
  const [isRouteOpen, setIsRouteOpen] = useState(initialRouteOpen);
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);

  const { calculatedRoute, isCalculatingRoute, calculateRoute, clearCalculatedRoute } =
    useRouteCalculation({
      origin,
      destination,
      transportMode,
      routeType: itemRouteType,
      onCalculated,
    });

  const openInGoogleMapsUrl = useMemo(() => {
    if (!origin || !destination) return undefined;
    return buildGoogleMapsDirectionsUrl({
      origin,
      destination,
      mode: transportMode,
    });
  }, [destination, origin, transportMode]);

  const showTravelControls = Boolean(destination) || itemType === 'transport';
  const displayedRouteDurationMinutes =
    calculatedRoute?.itemRouteDurationMinutes ?? existingRouteDurationMinutes;
  const hasCalculatedRoute = Boolean(calculatedRoute) || hasPersistedRoute;
  const canCalculateRoute = Boolean(origin && destination && itemRouteType === 'directions');
  const routeBadge = useMemo(
    () => formatRouteBadge(transportMode, itemRouteType, displayedRouteDurationMinutes),
    [displayedRouteDurationMinutes, itemRouteType, transportMode],
  );

  const handleRouteToggle = useCallback(() => {
    if (isRouteOpen) {
      setIsEditingOrigin(false);
      setIsEditingDestination(false);
    }
    setIsRouteOpen((current) => !current);
  }, [isRouteOpen]);

  const handleOriginEditStart = useCallback(() => {
    setIsEditingDestination(false);
    setIsEditingOrigin(true);
  }, []);

  const handleOriginEditCancel = useCallback(() => setIsEditingOrigin(false), []);

  const handleDestinationEditStart = useCallback(() => {
    setIsEditingOrigin(false);
    setIsEditingDestination(true);
  }, []);

  const handleDestinationEditCancel = useCallback(() => setIsEditingDestination(false), []);

  const resetUiState = useCallback(() => {
    setIsEditingOrigin(false);
    setIsEditingDestination(false);
    setIsRouteOpen(initialRouteOpen);
    clearCalculatedRoute();
  }, [clearCalculatedRoute, initialRouteOpen]);

  return {
    calculatedRoute,
    isCalculatingRoute,
    isRouteOpen,
    isEditingOrigin,
    isEditingDestination,
    openInGoogleMapsUrl,
    routeBadge,
    displayedRouteDurationMinutes,
    hasCalculatedRoute,
    showTravelControls,
    canCalculateRoute,
    handleRouteToggle,
    handleOriginEditStart,
    handleOriginEditCancel,
    handleDestinationEditStart,
    handleDestinationEditCancel,
    handleCalculateRoute: calculateRoute,
    clearCalculatedRoute,
    resetUiState,
  };
}
