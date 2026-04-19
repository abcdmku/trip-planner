import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Leg, TransportMode } from '@/types/trip';
import type { FeasibilityStatus } from '@/lib/route-feasibility';
import { RouteLegLabelPill } from '@/component-lib/map/RouteLegLabelPill';

const SELECTABLE_MODES: { mode: TransportMode; label: string }[] = [
  { mode: 'driving', label: 'Drive' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'bicycling', label: 'Bike' },
  { mode: 'transit', label: 'Transit' },
  { mode: 'flight', label: 'Flight' },
];

export interface RouteLegLabelProps {
  leg: Leg;
  position: { lat: number; lng: number };
  color: string;
  feasibilityStatus: FeasibilityStatus;
  isRecalculating?: boolean;
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
}

export default function RouteLegLabel({
  leg,
  position,
  color,
  isRecalculating = false,
  onModeChange,
}: RouteLegLabelProps) {
  const selectableModes =
    (leg.routeType ?? 'directions') === 'directions'
      ? SELECTABLE_MODES.filter(({ mode }) => mode !== 'flight')
      : SELECTABLE_MODES;

  return (
    <AdvancedMarker position={position} zIndex={50}>
      <RouteLegLabelPill
        mode={leg.mode}
        durationMinutes={leg.durationMinutes}
        color={color}
        isRecalculating={isRecalculating}
        selectableModes={selectableModes}
        onModeChange={onModeChange ? (mode) => onModeChange(leg, mode) : undefined}
      />
    </AdvancedMarker>
  );
}
