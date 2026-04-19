import { XCircle } from 'lucide-react';
import type { Item } from '@/types/trip';

export interface DroppedStopsBannerProps {
  items: { item: Item; reason: string }[];
}

export function DroppedStopsBanner({ items }: DroppedStopsBannerProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
        <XCircle className="h-4 w-4" />
        {items.length} stop{items.length !== 1 ? 's' : ''} dropped
      </div>
      <ul className="mt-2 space-y-1">
        {items.map(({ item, reason }) => (
          <li key={item.itemId} className="flex items-center gap-2 text-xs">
            <span className="text-stone-600">{item.placeName}</span>
            <span className="text-stone-400">- {reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
