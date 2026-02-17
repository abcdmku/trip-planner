import { Star } from 'lucide-react';

interface PrioritySelectorProps {
  value: number;
  onChange: (priority: number) => void;
  max?: number;
}

export function PrioritySelector({ value, onChange, max = 5 }: PrioritySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs font-medium text-stone-500">Priority</span>
      {Array.from({ length: max }, (_, i) => i + 1).map((level) => (
        <button
          key={level}
          onClick={() => onChange(value === level ? 0 : level)}
          className="transition-transform hover:scale-110"
          aria-label={`Priority ${level}`}
          title={`Priority ${level}`}
        >
          <Star
            className={`h-4 w-4 ${
              level <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-stone-200'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-xs text-stone-400">P{value}</span>
      )}
    </div>
  );
}
