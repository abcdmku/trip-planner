import type { ComponentProps } from 'react';
import LegInfoPopup from '@route-lib/trip-workspace/ui/map/LegInfoPopup';
import { START_LOCATION_ID } from '@/services/leg-recompute';
import type { Item, Leg, RouteType, TransportMode, Trip } from '@/types/trip';
import { createStartLocationItem } from './tripWorkspaceLegs';

interface BuildSelectedLegPopupPropsArgs {
  itemMap: Map<string, Item>;
  onClose: () => void;
  onModeChange: (leg: Leg, mode: TransportMode) => void;
  onRouteTypeChange: (leg: Leg, routeType: RouteType) => void;
  selectedLeg: Leg | null;
  trip: Trip | null | undefined;
}

export function buildSelectedLegPopupProps({
  itemMap,
  onClose,
  onModeChange,
  onRouteTypeChange,
  selectedLeg,
  trip,
}: BuildSelectedLegPopupPropsArgs): ComponentProps<typeof LegInfoPopup> | null {
  if (!selectedLeg) return null;

  const fromItem =
    selectedLeg.fromItemId === START_LOCATION_ID
      ? trip
        ? createStartLocationItem(trip)
        : undefined
      : itemMap.get(selectedLeg.fromItemId);
  const toItem = itemMap.get(selectedLeg.toItemId);
  if (!fromItem || !toItem) return null;

  return {
    leg: selectedLeg,
    fromItem,
    toItem,
    onClose,
    onModeChange: (mode) => {
      onModeChange(selectedLeg, mode);
      onClose();
    },
    onRouteTypeChange: (routeType) => {
      onRouteTypeChange(selectedLeg, routeType);
      onClose();
    },
  };
}
