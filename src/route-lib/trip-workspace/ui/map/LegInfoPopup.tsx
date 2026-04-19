import type { Item, Leg, RouteType, TransportMode } from '@/types/trip';
import { getFeasibilityColor, type FeasibilityStatus } from '@/lib/route-feasibility';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { buildGoogleMapsDirectionsUrl } from '@/lib/google-maps-url';
import { LegInfoCard } from '@/component-lib/map/LegInfoCard';

export interface LegInfoPopupProps {
  leg: Leg;
  fromItem: Item;
  toItem: Item;
  onClose: () => void;
  onModeChange?: (mode: TransportMode) => void;
  onRouteTypeChange?: (routeType: RouteType) => void;
}

const SELECTABLE_MODES: { mode: TransportMode; label: string }[] = [
  { mode: 'driving', label: 'Drive' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'bicycling', label: 'Bike' },
  { mode: 'transit', label: 'Transit' },
  { mode: 'flight', label: 'Flight' },
];

const ROUTE_TYPES: { type: RouteType; label: string }[] = [
  { type: 'directions', label: 'Routed' },
  { type: 'straight', label: 'Straight' },
];

const FEASIBILITY_LABELS: Record<FeasibilityStatus, string> = {
  over: 'Too slow',
  tight: 'Tight',
  comfortable: 'Comfortable',
  unknown: '',
};

export default function LegInfoPopup({
  leg,
  fromItem,
  toItem,
  onClose,
  onModeChange,
  onRouteTypeChange,
}: LegInfoPopupProps) {
  useEscapeHotkey(true, onClose);

  const feasibility = getFeasibilityColor(leg, fromItem, toItem);
  const selectableModes =
    (leg.routeType ?? 'directions') === 'directions'
      ? SELECTABLE_MODES.filter(({ mode }) => mode !== 'flight')
      : SELECTABLE_MODES;
  const hasCoords = (pos: { lat: number; lng: number }) => pos.lat !== 0 || pos.lng !== 0;
  const openInGoogleMapsUrl =
    hasCoords({ lat: fromItem.lat, lng: fromItem.lng }) && hasCoords({ lat: toItem.lat, lng: toItem.lng })
      ? buildGoogleMapsDirectionsUrl({
          origin: { lat: fromItem.lat, lng: fromItem.lng },
          destination: { lat: toItem.lat, lng: toItem.lng },
          mode: leg.mode,
        })
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      <div className="pointer-events-auto">
        <LegInfoCard
          leg={leg}
          fromName={fromItem.placeName}
          toName={toItem.placeName}
          onClose={onClose}
          onModeChange={onModeChange}
          onRouteTypeChange={onRouteTypeChange}
          feasibility={{
            status: feasibility.status,
            color: feasibility.color,
            label: FEASIBILITY_LABELS[feasibility.status],
          }}
          openInGoogleMapsUrl={openInGoogleMapsUrl}
          selectableModes={selectableModes}
          routeTypes={ROUTE_TYPES}
        />
      </div>
    </div>
  );
}
