import { Bike, Bus, Car, Circle, Footprints, Loader2, Plane, RotateCw } from 'lucide-react';
import type { RouteType, TransportMode } from '@/types/trip';

const MODE_OPTIONS: { value: TransportMode; label: string; Icon: typeof Car }[] = [
  { value: 'driving', label: 'Drive', Icon: Car },
  { value: 'walking', label: 'Walk', Icon: Footprints },
  { value: 'bicycling', label: 'Bike', Icon: Bike },
  { value: 'transit', label: 'Transit', Icon: Bus },
  { value: 'flight', label: 'Flight', Icon: Plane },
  { value: 'other', label: 'Other', Icon: Circle },
];

const ROUTE_OPTIONS: { value: RouteType; label: string }[] = [
  { value: 'directions', label: 'Routed' },
  { value: 'straight', label: 'Straight' },
];

const GOOGLE_ROUTE_MODES = new Set<TransportMode>(['driving', 'walking', 'bicycling', 'transit']);

function isGoogleRouteModeCapable(mode: TransportMode): boolean {
  return GOOGLE_ROUTE_MODES.has(mode);
}

function nextModeRoute(mode: TransportMode, current: RouteType): RouteType {
  if (mode === 'flight' || mode === 'other') return 'straight';
  return current;
}

export interface ItemRouteTravelControlsProps {
  transportMode: TransportMode;
  itemRouteType: RouteType;
  onChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
  compact?: boolean;
  hasOrigin?: boolean;
  hasDestination?: boolean;
  openInGoogleMapsUrl?: string;
  onCalculateRoute?: () => void;
  isCalculatingRoute?: boolean;
  canCalculateRoute?: boolean;
  hasCalculatedRoute?: boolean;
  travelDurationMinutes?: number;
}

export function ItemRouteTravelControls({
  transportMode,
  itemRouteType,
  onChange,
  compact = false,
  hasOrigin = true,
  hasDestination = true,
  openInGoogleMapsUrl,
  onCalculateRoute,
  isCalculatingRoute = false,
  canCalculateRoute = false,
  hasCalculatedRoute = false,
  travelDurationMinutes = 0,
}: ItemRouteTravelControlsProps) {
  const routeModeCapable = isGoogleRouteModeCapable(transportMode);
  const isRouted = itemRouteType === 'directions';
  const showRouteRow = true;
  const hasTravelDuration = isRouted && travelDurationMinutes > 0 && !isCalculatingRoute;
  const actionCount = Number(Boolean(isRouted && onCalculateRoute)) + Number(Boolean(openInGoogleMapsUrl));
  const routeRowClassName = compact
    ? 'space-y-2.5 rounded-lg bg-theme-subtle p-2.5'
    : 'grid gap-3 rounded-lg bg-theme-subtle p-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center';
  const routeActionsClassName = compact
    ? actionCount > 1
      ? 'grid grid-cols-2 gap-2'
      : 'grid grid-cols-1 gap-2'
    : 'flex flex-col gap-2 sm:flex-row md:justify-end';

  const calculateTitle = !canCalculateRoute
    ? !hasOrigin
      ? 'Set an origin to calculate'
      : !hasDestination
        ? 'Add a destination to calculate'
        : isRouted
          ? 'Unable to calculate'
          : 'Switch to Routed to calculate'
    : hasCalculatedRoute
      ? 'Update travel time'
      : 'Calculate travel time';

  const modePill = (active: boolean) =>
    compact
      ? `flex h-11 w-full items-center justify-center rounded-xl border text-[10px] font-semibold transition-colors ${
          active
            ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.15)] text-accent'
            : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
        }`
      : `flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
          active
            ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.15)] text-accent'
            : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
        }`;

  const routeTogglePill = (active: boolean) =>
    `inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[10px] font-semibold transition-colors ${
      active
        ? 'bg-[rgba(var(--color-accent),0.15)] text-accent'
        : 'text-theme-tertiary hover:bg-theme hover:text-theme-secondary'
    }`;

  return (
    <div
      className={`rounded-xl border border-theme bg-theme ${
        compact ? 'space-y-2 p-2' : 'space-y-2.5 p-2.5'
      }`}
    >
      <div
        className={
          compact
            ? 'grid grid-cols-3 gap-1.5 sm:grid-cols-6'
            : 'grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6'
        }
        role="group"
        aria-label="Travel mode"
      >
        {MODE_OPTIONS.map(({ value: mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() =>
              onChange({
                transportMode: mode,
                itemRouteType: nextModeRoute(mode, itemRouteType),
              })
            }
            className={modePill(transportMode === mode)}
            aria-pressed={transportMode === mode}
            aria-label={label}
            title={label}
          >
            <Icon className={`${compact ? 'h-5 w-5' : 'h-4 w-4'} shrink-0`} />
            {!compact ? <span className="truncate leading-none">{label}</span> : null}
          </button>
        ))}
      </div>

      {showRouteRow ? (
        <div className={routeRowClassName}>
          <div className="min-w-0">
            {routeModeCapable ? (
              <div className="inline-flex w-full rounded-md bg-theme p-0.5 md:w-auto">
                {ROUTE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange({ transportMode, itemRouteType: option.value })}
                    className={`${routeTogglePill(itemRouteType === option.value)} flex-1 md:flex-none`}
                    aria-pressed={itemRouteType === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="block text-[11px] font-semibold text-theme-secondary">
                  Straight line only
                </span>
                <span className="block text-[11px] text-theme-tertiary">
                  Flights and manual legs keep a direct path.
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 text-[11px] text-theme-tertiary">
            {hasTravelDuration ? (
              <span className="text-[13px] font-semibold tabular-nums text-accent">
                {travelDurationMinutes} min
              </span>
            ) : (
              <span className="line-clamp-2">
                {canCalculateRoute
                  ? hasCalculatedRoute
                    ? 'Refresh travel time after editing stops or mode.'
                    : 'Calculate travel time for this segment.'
                  : calculateTitle}
              </span>
            )}
          </div>

          <div className={routeActionsClassName}>
            {isRouted && onCalculateRoute ? (
              <button
                type="button"
                onClick={onCalculateRoute}
                disabled={!canCalculateRoute || isCalculatingRoute}
                className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-theme bg-theme px-2.5 py-1.5 text-[10px] font-semibold text-theme-secondary transition-colors hover:bg-theme hover:text-theme disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                aria-label={calculateTitle}
                title={calculateTitle}
              >
                {isCalculatingRoute ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                <span>{hasCalculatedRoute ? 'Update' : 'Calculate'}</span>
              </button>
            ) : null}

            {openInGoogleMapsUrl ? (
              <a
                href={openInGoogleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-theme-secondary transition-colors hover:bg-theme hover:text-theme sm:w-auto"
              >
                Open in Maps
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
