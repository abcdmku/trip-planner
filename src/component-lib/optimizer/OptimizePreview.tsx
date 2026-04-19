import { ArrowRight, Clock, Route } from 'lucide-react';
import type { OptimizeResult } from '@/services/optimizer-service';

export interface OptimizePreviewProps {
  result: OptimizeResult;
  mode: 'maximize' | 'minimize';
}

export function OptimizePreview({ result, mode }: OptimizePreviewProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Preview</h4>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <Clock className="h-3 w-3" />
            {result.totalTravelMinutes}m travel
          </span>
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <Route className="h-3 w-3" />
            {result.orderedItems.length} stops
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {result.orderedItems.map((item, index) => (
          <div key={item.itemId} className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
              {index + 1}
            </span>
            <span className="flex-1 truncate text-xs text-stone-700">{item.placeName}</span>
            {item.scheduledStart ? <span className="text-[10px] text-stone-400">{item.scheduledStart}</span> : null}
            {index < result.orderedItems.length - 1 ? <ArrowRight className="h-3 w-3 flex-shrink-0 text-stone-300" /> : null}
          </div>
        ))}
      </div>

      {mode === 'minimize' && result.totalTravelMinutes > 0 ? (
        <div className="mt-2 rounded-lg bg-teal-50 px-2 py-1 text-xs text-teal-700">
          Optimized route saves travel time
        </div>
      ) : null}
    </div>
  );
}
