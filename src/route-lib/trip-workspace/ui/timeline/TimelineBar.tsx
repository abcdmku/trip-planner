import type { Item } from '@/types/trip';

interface TimelineBarProps {
  item: Item;
  left: number;
  width: number;
  color: string;
  rowIndex: number;
  rowHeight: number;
  isSelected?: boolean;
  onClick?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  attraction: '🏛️',
  restaurant: '🍽️',
  hotel: '🏨',
  transport: '🚌',
  activity: '🎯',
  other: '📍',
};

export function TimelineBar({
  item,
  left,
  width,
  color,
  rowIndex,
  rowHeight,
  isSelected,
  onClick,
}: TimelineBarProps) {
  const top = rowIndex * rowHeight + 4;
  const barHeight = rowHeight - 8;

  return (
    <button
      onClick={onClick}
      className={`absolute flex items-center gap-1 overflow-hidden rounded-lg px-2 text-xs font-medium text-white transition-all hover:brightness-110 ${
        isSelected ? 'ring-2 ring-white ring-offset-1 shadow-lg' : 'shadow-sm'
      }`}
      style={{
        left,
        top,
        width: Math.max(width, 24),
        height: barHeight,
        backgroundColor: color,
      }}
      title={`${item.placeName} (${item.scheduledStart || '?'} – ${item.scheduledEnd || '?'})`}
      aria-label={`${item.placeName}, ${item.scheduledStart} to ${item.scheduledEnd}`}
    >
      <span className="flex-shrink-0 text-[10px]">{TYPE_ICONS[item.type] || '📍'}</span>
      <span className="truncate">{item.placeName}</span>
    </button>
  );
}
