// ---------------------------------------------------------------------------
// StartLocationMarker – A custom map marker for the trip's start location.
//
// Uses `<AdvancedMarker>` with a green home-style pin to distinguish it
// from regular itinerary item markers.
// ---------------------------------------------------------------------------

import { AdvancedMarker } from '@vis.gl/react-google-maps';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StartLocationMarkerProps {
  position: { lat: number; lng: number };
  name: string;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StartLocationMarker({
  position,
  name,
  onClick,
}: StartLocationMarkerProps) {
  return (
    <AdvancedMarker
      position={position}
      title={name || 'Start location'}
      onClick={onClick}
      zIndex={90}
    >
      <div
        style={{
          cursor: 'pointer',
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Circle with home icon */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: '#059669',
              border: '2.5px solid #047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="18"
              height="18"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          {/* Pin tail */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '8px solid #047857',
              marginTop: -1,
            }}
          />
        </div>
      </div>
    </AdvancedMarker>
  );
}
