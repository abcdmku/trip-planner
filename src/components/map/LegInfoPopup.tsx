// ---------------------------------------------------------------------------
// LegInfoPopup – A compact popup shown when clicking a route segment.
//
// Displays travel mode icon, duration, distance, and from/to names.
// ---------------------------------------------------------------------------

import type { Leg, Item, TransportMode, RouteType } from '@/types/trip';
import { getFeasibilityColor, type FeasibilityStatus } from '@/lib/route-feasibility';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LegInfoPopupProps {
  leg: Leg;
  fromItem: Item;
  toItem: Item;
  onClose: () => void;
  onModeChange?: (mode: TransportMode) => void;
  onRouteTypeChange?: (routeType: RouteType) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format duration in minutes to a friendly string like "1h 30m". */
function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format distance in meters to a friendly string. */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

/** Readable label for a transport mode. */
const MODE_LABELS: Record<TransportMode, string> = {
  driving: 'Drive',
  walking: 'Walk',
  bicycling: 'Bike',
  transit: 'Transit',
  flight: 'Flight',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A compact popup overlay displaying leg information.
 *
 * Positioned fixed in the bottom-center of the viewport (above the map) to
 * avoid interfering with map interaction. Clicking the X button or the
 * backdrop triggers `onClose`.
 */
const SELECTABLE_MODES: { mode: TransportMode; label: string }[] = [
  { mode: 'driving', label: 'Drive' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'bicycling', label: 'Bike' },
  { mode: 'transit', label: 'Transit' },
  { mode: 'flight', label: 'Flight' },
];

const FEASIBILITY_LABELS: Record<FeasibilityStatus, string> = {
  over: 'Too slow',
  tight: 'Tight',
  comfortable: 'Comfortable',
  unknown: '',
};

const ROUTE_TYPES: { type: RouteType; label: string }[] = [
  { type: 'directions', label: 'Routed' },
  { type: 'straight', label: 'Straight' },
];

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 pointer-events-none">
      {/* Backdrop (invisible but catches clicks to close) */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 max-w-sm w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        {/* Mode icon, label, and feasibility badge */}
        <div className="flex items-center gap-2 mb-2">
          <ModeIcon mode={leg.mode} />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {MODE_LABELS[leg.mode] ?? leg.mode}
          </span>
          {feasibility.status !== 'unknown' && (
            <span
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: feasibility.color }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-white/60"
              />
              {FEASIBILITY_LABELS[feasibility.status]}
            </span>
          )}
        </div>

        {/* From -> To */}
        <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <span className="font-semibold truncate max-w-[120px]" title={fromItem.placeName}>
            {fromItem.placeName}
          </span>
          <ArrowIcon />
          <span className="font-semibold truncate max-w-[120px]" title={toItem.placeName}>
            {toItem.placeName}
          </span>
        </div>

        {/* Duration and distance */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ClockIcon />
            {formatDuration(leg.durationMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <DistanceIcon />
            {formatDistance(leg.distanceMeters)}
          </span>
        </div>

        {/* Transport mode selector */}
        {onModeChange && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Change mode</div>
            <div className="flex gap-1">
              {SELECTABLE_MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  title={label}
                  onClick={() => onModeChange(mode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mode === leg.mode
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <ModeIcon mode={mode} size="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Route type selector */}
        {onRouteTypeChange && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Route type</div>
            <div className="flex gap-1">
              {ROUTE_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  title={label}
                  onClick={() => onRouteTypeChange(type)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    type === (leg.routeType ?? 'directions')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'directions' ? (
                    <RouteIcon />
                  ) : (
                    <StraightLineIcon />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons – avoids importing a full icon library
// ---------------------------------------------------------------------------

function ModeIcon({ mode, size }: { mode: TransportMode; size?: string }) {
  const className = size ?? 'w-5 h-5 text-gray-700';

  switch (mode) {
    case 'driving':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </svg>
      );
    case 'walking':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
        </svg>
      );
    case 'bicycling':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
        </svg>
      );
    case 'transit':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      );
    case 'other':
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      );
  }
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="w-3.5 h-3.5 flex-shrink-0 text-gray-400"
    >
      <path
        fillRule="evenodd"
        d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 flex-shrink-0"
    >
      <path
        fillRule="evenodd"
        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .199.079.39.22.53l2 2a.75.75 0 1 0 1.06-1.06L8.75 7.94V4.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DistanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 flex-shrink-0"
    >
      <path
        fillRule="evenodd"
        d="M5.37 2.257a1.25 1.25 0 0 1 1.26 0l3.5 2.03A1.25 1.25 0 0 1 10.75 5.5v4.691l-2.5-1.45V5.5L6 4.345 3.75 5.5v3.241l2.5 1.45v2.5L2.87 10.662A1.25 1.25 0 0 1 2.25 9.5V5.5c0-.45.242-.866.634-1.088l2.5-1.45-.014-.005Zm5.38 5.434 2.5 1.45V5.5l-2.5-1.45v3.641Zm0 2.5v2.5l2.866-1.662a1.25 1.25 0 0 0 .634-1.088V5.5a1.25 1.25 0 0 0-.62-1.08l-3.5-2.03a1.25 1.25 0 0 0-1.26 0L5.25 4.654v2.5l2.5 1.45v3.241l2.87-1.662.13-.075v-.892Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5 flex-shrink-0"
    >
      <path
        fillRule="evenodd"
        d="M3.25 2a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V4.56l2.22 2.22a.75.75 0 0 0 1.06 0L9 5.06l3.22 3.22a.75.75 0 1 0 1.06-1.06l-3.75-3.75a.75.75 0 0 0-1.06 0L6.75 5.19 4.56 3H6.5a.75.75 0 0 0 0-1.5h-3.25ZM2.5 10.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75Zm0 2.5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StraightLineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5 flex-shrink-0"
    >
      <path d="M13.78 2.22a.75.75 0 0 1 0 1.06l-10.5 10.5a.75.75 0 0 1-1.06-1.06l10.5-10.5a.75.75 0 0 1 1.06 0Z" />
      <path d="M14 2.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2.75Z" />
    </svg>
  );
}
