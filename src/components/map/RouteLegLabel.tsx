// ---------------------------------------------------------------------------
// RouteLegLabel – An inline label rendered at the midpoint of a route leg.
//
// Shows a compact pill with a mode icon and duration text, coloured by
// feasibility status. Clicking the pill expands a transport mode selector
// so the user can change the travel mode for that leg.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Leg, TransportMode } from '@/types/trip';
import type { FeasibilityStatus } from '@/lib/route-feasibility';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RouteLegLabelProps {
  leg: Leg;
  position: { lat: number; lng: number };
  color: string;
  feasibilityStatus: FeasibilityStatus;
  isRecalculating?: boolean;
  onModeChange?: (leg: Leg, newMode: TransportMode) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SELECTABLE_MODES: { mode: TransportMode; label: string }[] = [
  { mode: 'driving', label: 'Drive' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'bicycling', label: 'Bike' },
  { mode: 'transit', label: 'Transit' },
  { mode: 'flight', label: 'Flight' },
];

const GOOGLE_DIRECTIONS_MODE_SET = new Set<TransportMode>([
  'driving',
  'walking',
  'bicycling',
  'transit',
]);

// ---------------------------------------------------------------------------
// Mode icons (compact inline SVGs)
// ---------------------------------------------------------------------------

function ModeIconSmall({ mode, className }: { mode: TransportMode; className?: string }) {
  const cls = className ?? 'w-3.5 h-3.5';

  switch (mode) {
    case 'driving':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
        </svg>
      );
    case 'walking':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
        </svg>
      );
    case 'bicycling':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
        </svg>
      );
    case 'transit':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RouteLegLabel({
  leg,
  position,
  color,
  feasibilityStatus,
  isRecalculating = false,
  onModeChange,
}: RouteLegLabelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectableModes =
    (leg.routeType ?? 'directions') === 'directions'
      ? SELECTABLE_MODES.filter(({ mode }) => GOOGLE_DIRECTIONS_MODE_SET.has(mode))
      : SELECTABLE_MODES;

  // Close selector when clicking outside.
  useEffect(() => {
    if (!isExpanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handlePillClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onModeChange) {
        setIsExpanded((prev) => !prev);
      }
    },
    [onModeChange],
  );

  const handleModeSelect = useCallback(
    (mode: TransportMode) => {
      if (mode === leg.mode) {
        setIsExpanded(false);
        return;
      }
      setIsExpanded(false);
      onModeChange?.(leg, mode);
    },
    [leg, onModeChange],
  );

  // Determine text colour for contrast against the feasibility background.
  const textColor = feasibilityStatus === 'unknown' ? '#FFFFFF' : '#FFFFFF';

  return (
    <AdvancedMarker
      position={position}
      zIndex={50}
    >
      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Main pill */}
        <button
          onClick={handlePillClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 12,
            backgroundColor: color,
            color: textColor,
            border: '1.5px solid rgba(255,255,255,0.3)',
            cursor: onModeChange ? 'pointer' : 'default',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            transform: isExpanded ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {isRecalculating ? (
            <SpinnerIcon />
          ) : (
            <ModeIconSmall mode={leg.mode} />
          )}
          <span>{formatDuration(leg.durationMinutes)}</span>
        </button>

        {/* Expanded mode selector */}
        {isExpanded && !isRecalculating && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 4,
              display: 'flex',
              gap: 2,
              padding: 3,
              borderRadius: 10,
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 100,
            }}
          >
            {selectableModes.map(({ mode, label }) => (
              <button
                key={mode}
                title={label}
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect(mode);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 28,
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    mode === leg.mode ? color : 'transparent',
                  color: mode === leg.mode ? '#fff' : '#374151',
                  transition: 'background-color 150ms ease',
                }}
              >
                <ModeIconSmall mode={mode} className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}

// ---------------------------------------------------------------------------
// Spinner icon for recalculating state
// ---------------------------------------------------------------------------

function SpinnerIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
