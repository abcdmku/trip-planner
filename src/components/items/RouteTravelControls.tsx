import { useState } from 'react';
import { Loader2, RotateCw, Bike, Bus, Car, Circle, Footprints, Plane, ChevronDown } from 'lucide-react';
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

function getTransportBadge(mode: TransportMode, routeType: RouteType): string {
  const modeLabel = MODE_OPTIONS.find((m) => m.value === mode)?.label ?? 'Drive';
  const routeLabel = routeType === 'directions' ? 'Routed' : 'Straight';
  return `${modeLabel} \u00b7 ${routeLabel}`;
}

export function RouteTravelControls({
  transportMode,
  itemRouteType,
  onChange,
  compact = false,
  hasOrigin = true,
  hasDestination = true,
  onCalculateRoute,
  isCalculatingRoute = false,
  canCalculateRoute = false,
  hasCalculatedRoute = false,
}: {
  transportMode: TransportMode;
  itemRouteType: RouteType;
  onChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
  compact?: boolean;
  hasOrigin?: boolean;
  hasDestination?: boolean;
  onCalculateRoute?: () => void;
  isCalculatingRoute?: boolean;
  canCalculateRoute?: boolean;
  hasCalculatedRoute?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      active
        ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.15)] text-accent'
        : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
    }`;

  const modeBadge = getTransportBadge(transportMode, itemRouteType);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-theme-secondary">Travel</span>
        <span className="flex items-center gap-2">
          <span className="truncate text-[11px] text-theme-tertiary">{modeBadge}</span>
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? 'Hide' : 'Details'}
            <ChevronDown className={`h-3 w-3 transition-transform ${detailsOpen ? '' : '-rotate-90'}`} />
          </button>
        </span>
      </div>

      <div>
        <label className="mb-1 block text-[10px] text-theme-tertiary">Mode</label>
        <div className="flex flex-wrap gap-1.5">
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
              className={pill(transportMode === mode)}
              aria-pressed={transportMode === mode}
              aria-label={label}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {detailsOpen ? (
        <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
          <div>
            <label className="mb-1 block text-[10px] text-theme-tertiary">Route Style</label>
            {!isGoogleRouteModeCapable(transportMode) ? (
              <div className="rounded-lg border border-theme bg-theme px-2.5 py-2 text-[11px] text-theme-secondary">
                <div className="font-semibold text-theme">Straight line</div>
                <div className="mt-0.5 text-theme-tertiary">
                  Routed directions are unavailable for Flight and Other.
                </div>
              </div>
            ) : (
              <div className="flex rounded-lg border border-theme bg-theme-subtle p-0.5">
                {ROUTE_OPTIONS.map((option) => {
                  const active = itemRouteType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange({ transportMode, itemRouteType: option.value })}
                      className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? 'bg-theme-elevated text-theme shadow-sm'
                          : 'text-theme-tertiary hover:text-theme-secondary'
                      }`}
                      aria-pressed={active}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-theme-tertiary">
              Routed uses Google directions. Straight draws a simple line.
            </p>
          </div>

          {onCalculateRoute ? (
            <div className="rounded-lg border border-theme bg-theme px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-theme">Travel time</div>
                  <div className="text-[11px] text-theme-tertiary">
                    {canCalculateRoute
                      ? 'Use Maps to estimate duration.'
                      : itemRouteType !== 'directions'
                        ? isGoogleRouteModeCapable(transportMode)
                          ? 'Switch route style to Routed to calculate.'
                          : 'Routed directions are unavailable for this mode.'
                        : !hasOrigin
                          ? 'Choose an origin to calculate.'
                          : !hasDestination
                            ? 'Add a destination to calculate.'
                            : 'Unable to calculate travel time.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCalculateRoute}
                  disabled={!canCalculateRoute || isCalculatingRoute}
                  className="inline-flex items-center gap-2 rounded-lg border border-theme bg-theme-elevated px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCalculatingRoute ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                  {hasCalculatedRoute ? 'Recalculate' : 'Calculate'}
                </button>
              </div>
              {isCalculatingRoute ? (
                <div className="mt-1 text-[11px] text-theme-tertiary">Calculating...</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
