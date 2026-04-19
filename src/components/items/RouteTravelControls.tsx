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

export function RouteTravelControls({
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
}: {
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
}) {
  const routeModeCapable = isGoogleRouteModeCapable(transportMode);
  const isRouted = itemRouteType === 'directions';
  const showRouteRow = routeModeCapable || Boolean(openInGoogleMapsUrl);

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
    `flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors ${
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
        className="grid grid-cols-3 gap-1.5 sm:grid-cols-6"
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
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate leading-none">{label}</span>
          </button>
        ))}
      </div>

      {showRouteRow ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-theme-subtle px-2 py-1.5">
          {routeModeCapable ? (
            <div className="inline-flex rounded-md bg-theme-subtle p-0.5">
              {ROUTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange({ transportMode, itemRouteType: option.value })}
                  className={routeTogglePill(itemRouteType === option.value)}
                  aria-pressed={itemRouteType === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-theme-tertiary">Straight line</span>
          )}

          {isRouted && travelDurationMinutes > 0 && !isCalculatingRoute ? (
            <span className="animate-in text-[13px] font-semibold tabular-nums text-accent">
              {travelDurationMinutes} min
            </span>
          ) : null}

          <div className="flex-1" />

          {isRouted && onCalculateRoute ? (
            <button
              type="button"
              onClick={onCalculateRoute}
              disabled={!canCalculateRoute || isCalculatingRoute}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-theme-tertiary transition-colors hover:bg-theme hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={calculateTitle}
              title={calculateTitle}
            >
              {isCalculatingRoute ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          {openInGoogleMapsUrl ? (
            <a
              href={openInGoogleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-semibold text-theme-secondary transition-colors hover:text-theme hover:underline"
            >
              Maps
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
