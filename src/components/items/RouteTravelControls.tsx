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

function getCalculateHint({
  canCalculateRoute,
  hasOrigin,
  hasDestination,
  itemRouteType,
  transportMode,
}: {
  canCalculateRoute: boolean;
  hasOrigin: boolean;
  hasDestination: boolean;
  itemRouteType: RouteType;
  transportMode: TransportMode;
}): string {
  if (canCalculateRoute) return 'Estimated time updates the Time section below.';
  if (itemRouteType !== 'directions') {
    return isGoogleRouteModeCapable(transportMode)
      ? 'Switch route style to Routed to calculate.'
      : 'Routed directions are unavailable for this mode.';
  }
  if (!hasOrigin) return 'Choose an origin to calculate.';
  if (!hasDestination) return 'Add a destination to calculate.';
  return 'Unable to calculate travel time.';
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
  const calculateHint = getCalculateHint({
    canCalculateRoute,
    hasOrigin,
    hasDestination,
    itemRouteType,
    transportMode,
  });
  const durationLabel = isCalculatingRoute
    ? 'Updating...'
    : travelDurationMinutes > 0
      ? `${travelDurationMinutes} min`
      : 'Not estimated';
  const durationStatus = isCalculatingRoute
    ? 'Fetching route details'
    : travelDurationMinutes > 0
      ? 'Latest route duration'
      : canCalculateRoute
        ? 'Ready to estimate'
        : 'Estimate unavailable';
  const modePill = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors ${
      active
        ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.15)] text-accent'
        : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
    }`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Travel mode">
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
            <Icon className="h-3.5 w-3.5" />
            <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid auto-rows-fr gap-2 md:grid-cols-[minmax(0,1fr)_188px]">
        <div className="flex h-full min-h-[88px] flex-col rounded-lg border border-theme bg-theme px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-theme-tertiary">
              Route options
            </span>
            <span className="truncate text-[10px] text-theme-tertiary">
              {routeModeCapable ? 'Maps or direct line' : 'Direct line only'}
            </span>
          </div>

          <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5">
            {routeModeCapable ? (
              ROUTE_OPTIONS.map((option) => {
                const active = itemRouteType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange({ transportMode, itemRouteType: option.value })}
                    className={`flex h-full min-h-[42px] items-center justify-center rounded-lg border px-3 text-[11px] font-semibold transition-all ${
                      active
                        ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.12)] text-accent'
                        : 'border-theme bg-theme-elevated text-theme-secondary hover:bg-theme-subtle hover:text-theme'
                    }`}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <div className="col-span-2 flex h-full min-h-[42px] items-center rounded-lg border border-theme bg-theme-elevated px-3 text-[11px] text-theme-secondary">
                Flight and Other always use a straight line.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full min-h-[88px] rounded-lg border border-theme bg-theme">
          <div className="min-w-0 flex-1 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-theme-tertiary">
              Estimated time
            </div>
            <div className="mt-2 text-[18px] font-semibold leading-none tabular-nums text-theme">
              {durationLabel}
            </div>
            <div className="mt-1 truncate text-[11px] text-theme-tertiary">
              {durationStatus}
            </div>
          </div>

          {onCalculateRoute ? (
            <button
              type="button"
              onClick={onCalculateRoute}
              disabled={!canCalculateRoute || isCalculatingRoute}
              className="inline-flex w-11 shrink-0 items-center justify-center border-l border-theme bg-theme-elevated text-theme-secondary transition-colors hover:bg-theme-subtle disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={hasCalculatedRoute ? 'Update travel time' : 'Calculate travel time'}
              title={hasCalculatedRoute ? 'Update travel time' : 'Calculate travel time'}
            >
              {isCalculatingRoute ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 text-[11px] text-theme-tertiary">{calculateHint}</span>
        {openInGoogleMapsUrl ? (
          <a
            href={openInGoogleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-theme-secondary underline-offset-4 transition-colors hover:text-theme hover:underline"
          >
            Open in Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}
