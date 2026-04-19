import type { ItemType } from '@/types/trip';

const TYPE_CONFIG: Record<ItemType, { bg: string; border: string; glyph: string; label: string }> = {
  attraction: { bg: '#EF4444', border: '#B91C1C', glyph: '#FFFFFF', label: 'A' },
  restaurant: { bg: '#F97316', border: '#C2410C', glyph: '#FFFFFF', label: 'R' },
  hotel: { bg: '#3B82F6', border: '#1D4ED8', glyph: '#FFFFFF', label: 'H' },
  transport: { bg: '#8B5CF6', border: '#6D28D9', glyph: '#FFFFFF', label: 'T' },
  activity: { bg: '#10B981', border: '#047857', glyph: '#FFFFFF', label: 'V' },
  other: { bg: '#6B7280', border: '#374151', glyph: '#FFFFFF', label: 'O' },
};

export interface ItemMarkerPinProps {
  itemType: ItemType;
  isSelected?: boolean;
}

export function ItemMarkerPin({ itemType, isSelected = false }: ItemMarkerPinProps) {
  const config = TYPE_CONFIG[itemType] ?? TYPE_CONFIG.other;

  return (
    <div
      aria-hidden="true"
      className="tp-item-marker-pin"
      style={{
        transform: isSelected ? 'scale(1.35)' : 'scale(1)',
        transition: 'transform 200ms ease-out',
        animation: isSelected ? 'marker-bounce 0.6s ease-in-out' : undefined,
      }}
    >
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

      {isSelected && (
        <style>{`
          @keyframes marker-bounce {
            0%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
            60% { transform: translateY(-3px); }
          }
        `}</style>
      )}
    </div>
  );
}
