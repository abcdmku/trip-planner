import { Bike, Bus, Car, Footprints } from 'lucide-react';
import type { TransportMode } from '@/types/trip';

export interface TransportModeSelectorProps {
  value: TransportMode;
  onChange: (mode: TransportMode) => void;
  compact?: boolean;
}

const MODES: { value: TransportMode; label: string; icon: typeof Car }[] = [
  { value: 'driving', label: 'Drive', icon: Car },
  { value: 'walking', label: 'Walk', icon: Footprints },
  { value: 'bicycling', label: 'Bike', icon: Bike },
  { value: 'transit', label: 'Transit', icon: Bus },
];

export function TransportModeSelector({
  value,
  onChange,
  compact = false,
}: TransportModeSelectorProps) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Transport mode">
      {MODES.map(({ value: mode, label, icon: Icon }) => {
        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1 rounded-lg transition-all ${
              compact ? 'p-1.5' : 'px-2.5 py-1.5'
            } ${
              isActive
                ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'
            }`}
            title={label}
          >
            <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            {!compact ? <span className="text-xs font-medium">{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
