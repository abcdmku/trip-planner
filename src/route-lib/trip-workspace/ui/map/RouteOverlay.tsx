// ---------------------------------------------------------------------------
// RouteOverlay – Renders all route paths and leg labels for active days.
//
// For each leg, draws a RoutePath coloured by feasibility (red/yellow/green)
// and renders a RouteLegLabel at the midpoint with mode icon + duration.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import type { Leg, Day, Item, Trip, TransportMode } from '@/types/trip';
import { START_LOCATION_ID } from '@/services/leg-recompute';
import { getFeasibilityColor, getDayColorForItem } from '@/lib/route-feasibility';
import { getMidpoint } from './route-path-utils';
import RoutePath from './RoutePath';
import RouteLegLabel from './RouteLegLabel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RouteOverlayProps {
  /** All legs to potentially render. */
  legs: Leg[];
  /** All days in the trip (used for colour lookup). */
  days: Day[];
  /** Only render legs for items belonging to these day IDs. If empty/undefined, renders all. */
  selectedDayIds?: string[];
  /** All items in the trip (used to resolve fromItemId -> dayId). */
  items: Item[];
  /** Trip metadata (used for start location coordinates). */
  trip?: Trip | null;
  /** Optional callback when a route segment is clicked. */
  onLegClick?: (leg: Leg) => void;
  /** Callback when the user changes a leg's transport mode. */
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
  /** Set of leg IDs currently being recalculated. */
  recalculatingLegIds?: Set<string>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RouteOverlay({
  legs,
  days,
  selectedDayIds,
  items,
  trip,
  onLegClick,
  onModeChange,
  recalculatingLegIds,
}: RouteOverlayProps) {
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.itemId, item])),
    [items],
  );

  const dayMap = useMemo(
    () => new Map(days.map((day) => [day.dayId, day])),
    [days],
  );

  const selectedDaySet = useMemo(
    () => (selectedDayIds && selectedDayIds.length > 0 ? new Set(selectedDayIds) : null),
    [selectedDayIds],
  );

  // Filter and enrich legs with feasibility colour information.
  const visibleLegs = useMemo(() => {
    return legs
      .map((leg) => {
        const isStartLeg = leg.fromItemId === START_LOCATION_ID;

        // Resolve from/to positions.
        let fromPos: { lat: number; lng: number } | null = null;
        let fromItem: Item | undefined;

        if (isStartLeg && trip && (trip.startLat !== 0 || trip.startLng !== 0)) {
          fromPos = { lat: trip.startLat, lng: trip.startLng };
        } else {
          fromItem = itemMap.get(leg.fromItemId);
          if (fromItem) {
            fromPos = { lat: fromItem.lat, lng: fromItem.lng };
          }
        }

        const toItem = itemMap.get(leg.toItemId);
        if (!fromPos || !toItem) return null;

        // Filter by selected days (use toItem's day for start legs).
        if (selectedDaySet) {
          const dayId = isStartLeg ? toItem.dayId : (fromItem?.dayId ?? toItem.dayId);
          if (!selectedDaySet.has(dayId)) return null;
        }

        // Only render a straight segment when the leg is explicitly marked straight.
        const isStraight = leg.routeType === 'straight';
        if (!isStraight && !leg.routePathEncoded) return null;

        // Compute feasibility colour.
        // For start legs, use a neutral colour since there's no fromItem schedule.
        let feasibility;
        if (isStartLeg || !fromItem) {
          const dayColor = toItem ? getDayColorForItem(toItem, dayMap) : '#4285F4';
          feasibility = { color: dayColor, status: 'unknown' as const };
        } else {
          const dayColor = getDayColorForItem(fromItem, dayMap);
          feasibility = getFeasibilityColor(leg, fromItem, toItem, dayColor);
        }

        const toPos = { lat: toItem.lat, lng: toItem.lng };

        return { leg, fromItem, toItem, fromPos, toPos, feasibility, isStraight };
      })
      .filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null,
      );
  }, [legs, itemMap, dayMap, selectedDaySet, trip]);

  return (
    <>
      {visibleLegs.map(({ leg, fromPos, toPos, feasibility, isStraight }) => (
        <RoutePath
          key={leg.legId}
          encodedPath={isStraight ? '' : leg.routePathEncoded}
          fromLatLng={isStraight ? fromPos : undefined}
          toLatLng={isStraight ? toPos : undefined}
          color={feasibility.color}
          weight={4}
          opacity={0.75}
          onClick={onLegClick ? () => onLegClick(leg) : undefined}
        />
      ))}
      {visibleLegs.map(({ leg, fromPos, toPos, feasibility, isStraight }) => {
        // For straight-line legs, midpoint is the geographic midpoint.
        let midpoint: { lat: number; lng: number } | null;
        if (isStraight) {
          midpoint = {
            lat: (fromPos.lat + toPos.lat) / 2,
            lng: (fromPos.lng + toPos.lng) / 2,
          };
        } else {
          midpoint = getMidpoint(leg.routePathEncoded);
        }
        if (!midpoint) return null;

        return (
          <RouteLegLabel
            key={`label-${leg.legId}`}
            leg={leg}
            position={midpoint}
            color={feasibility.color}
            feasibilityStatus={feasibility.status}
            isRecalculating={recalculatingLegIds?.has(leg.legId)}
            onModeChange={onModeChange}
          />
        );
      })}
    </>
  );
}
