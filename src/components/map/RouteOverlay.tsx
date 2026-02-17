// ---------------------------------------------------------------------------
// RouteOverlay – Renders all route paths and leg labels for active days.
//
// For each leg, draws a RoutePath coloured by feasibility (red/yellow/green)
// and renders a RouteLegLabel at the midpoint with mode icon + duration.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import type { Leg, Day, Item, TransportMode } from '@/types/trip';
import { getFeasibilityColor, getDayColorForItem } from '@/lib/route-feasibility';
import { getMidpoint } from './RoutePath';
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
        const fromItem = itemMap.get(leg.fromItemId);
        const toItem = itemMap.get(leg.toItemId);
        if (!fromItem || !toItem) return null;

        // Filter by selected days.
        if (selectedDaySet && !selectedDaySet.has(fromItem.dayId)) return null;

        // Skip legs without a route polyline.
        if (!leg.routePathEncoded) return null;

        // Compute feasibility colour.
        const dayColor = getDayColorForItem(fromItem, dayMap);
        const feasibility = getFeasibilityColor(leg, fromItem, toItem, dayColor);

        return { leg, fromItem, toItem, feasibility };
      })
      .filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null,
      );
  }, [legs, itemMap, dayMap, selectedDaySet]);

  return (
    <>
      {visibleLegs.map(({ leg, feasibility }) => (
        <RoutePath
          key={leg.legId}
          encodedPath={leg.routePathEncoded}
          color={feasibility.color}
          weight={4}
          opacity={0.75}
          onClick={onLegClick ? () => onLegClick(leg) : undefined}
        />
      ))}
      {visibleLegs.map(({ leg, feasibility }) => {
        const midpoint = getMidpoint(leg.routePathEncoded);
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
