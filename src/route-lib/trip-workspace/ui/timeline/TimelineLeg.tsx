import type { Leg } from '@/types/trip';

interface TimelineLegProps {
  leg: Leg;
  fromRight: number;
  toLeft: number;
  rowIndex: number;
  rowHeight: number;
  onClick?: () => void;
}

const MODE_ICONS: Record<string, string> = {
  driving: '🚗',
  walking: '🚶',
  bicycling: '🚴',
  transit: '🚌',
};

export function TimelineLeg({
  leg,
  fromRight,
  toLeft,
  rowIndex,
  rowHeight,
  onClick,
}: TimelineLegProps) {
  const top = rowIndex * rowHeight + rowHeight / 2;
  const width = toLeft - fromRight;

  if (width <= 0) return null;

  return (
    <button
      onClick={onClick}
      className="absolute flex items-center justify-center"
      style={{
        left: fromRight,
        top: top - 8,
        width,
        height: 16,
      }}
      title={`${MODE_ICONS[leg.mode] || '→'} ${leg.durationMinutes}min`}
      aria-label={`Travel: ${leg.durationMinutes} minutes by ${leg.mode}`}
    >
      <div className="h-px w-full bg-stone-300" />
      <span className="absolute rounded bg-white px-1 text-[9px] text-stone-400">
        {leg.durationMinutes}m
      </span>
    </button>
  );
}
