import { useCallback } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Item, ItemType } from '@/types/trip';

// ---------------------------------------------------------------------------
// Colour & letter mapping per item type
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<ItemType, { bg: string; border: string; glyph: string; label: string }> = {
  attraction: { bg: '#EF4444', border: '#B91C1C', glyph: '#FFFFFF', label: 'A' },
  restaurant: { bg: '#F97316', border: '#C2410C', glyph: '#FFFFFF', label: 'R' },
  hotel:      { bg: '#3B82F6', border: '#1D4ED8', glyph: '#FFFFFF', label: 'H' },
  transport:  { bg: '#8B5CF6', border: '#6D28D9', glyph: '#FFFFFF', label: 'T' },
  activity:   { bg: '#10B981', border: '#047857', glyph: '#FFFFFF', label: 'V' },
  other:      { bg: '#6B7280', border: '#374151', glyph: '#FFFFFF', label: 'O' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ItemMarkerProps {
  item: Item;
  isSelected?: boolean;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A map marker for a single itinerary item.
 *
 * Uses `<AdvancedMarker>` from `@vis.gl/react-google-maps` with a custom
 * coloured pin whose glyph letter represents the item type. When selected
 * the marker is scaled up with a subtle bounce animation.
 */
export default function ItemMarker({ item, isSelected = false, onClick }: ItemMarkerProps) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other;
  const scale = isSelected ? 1.35 : 1;

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <AdvancedMarker
      position={{ lat: item.lat, lng: item.lng }}
      title={item.placeName}
      onClick={handleClick}
      zIndex={isSelected ? 100 : undefined}
    >
      <div
        className={isSelected ? 'animate-marker-bounce' : ''}
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 200ms ease-out',
          cursor: 'pointer',
        }}
      >
        {/* Outer pin shape */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            filter: isSelected
              ? 'drop-shadow(0 0 6px rgba(59,130,246,0.6))'
              : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          }}
        >
          {/* Circle */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: config.bg,
              border: `2.5px solid ${config.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.glyph,
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {config.label}
          </div>
          {/* Pin tail */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${config.border}`,
              marginTop: -1,
            }}
          />
        </div>
      </div>

      {/* Bounce keyframes injected via <style> for the selected animation */}
      {isSelected && (
        <style>{`
          @keyframes marker-bounce {
            0%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
            60% { transform: translateY(-3px); }
          }
          .animate-marker-bounce {
            animation: marker-bounce 0.6s ease-in-out;
          }
        `}</style>
      )}
    </AdvancedMarker>
  );
}
