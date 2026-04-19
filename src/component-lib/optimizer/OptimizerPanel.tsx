import { useState } from 'react';
import { Loader2, TrendingDown, Zap } from 'lucide-react';
import type { Day } from '@/types/trip';
import type { OptimizeResult } from '@/services/optimizer-service';
import { OptimizePreview } from './OptimizePreview';
import { DroppedStopsBanner } from './DroppedStopsBanner';

export interface OptimizerPanelProps {
  selectedDay?: Day;
  isOptimizing: boolean;
  previewResult: OptimizeResult | null;
  onOptimize: (mode: 'maximize' | 'minimize') => void;
  onApply: () => void;
  onClear: () => void;
}

export function OptimizerPanel({
  selectedDay,
  isOptimizing,
  previewResult,
  onOptimize,
  onApply,
  onClear,
}: OptimizerPanelProps) {
  const [mode, setMode] = useState<'maximize' | 'minimize'>('maximize');

  if (!selectedDay) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Zap className="h-8 w-8 text-stone-300" />
        <p className="text-sm text-stone-500">Select a day to optimize</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-700">Optimize Schedule</h3>
        <p className="text-xs text-stone-400">Optimize {selectedDay.label || selectedDay.date}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('maximize')}
          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
            mode === 'maximize'
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-stone-200 text-stone-500 hover:border-stone-300'
          }`}
        >
          <Zap className="h-5 w-5" />
          <span className="text-xs font-semibold">Max Activities</span>
          <span className="text-[10px] opacity-70">Fit the most stops</span>
        </button>
        <button
          onClick={() => setMode('minimize')}
          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
            mode === 'minimize'
              ? 'border-teal-300 bg-teal-50 text-teal-800'
              : 'border-stone-200 text-stone-500 hover:border-stone-300'
          }`}
        >
          <TrendingDown className="h-5 w-5" />
          <span className="text-xs font-semibold">Min Travel</span>
          <span className="text-[10px] opacity-70">Shortest total travel</span>
        </button>
      </div>

      <button
        onClick={() => onOptimize(mode)}
        disabled={isOptimizing}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Optimize
          </>
        )}
      </button>

      {previewResult ? (
        <>
          <OptimizePreview result={previewResult} mode={mode} />
          {previewResult.droppedItems.length > 0 ? <DroppedStopsBanner items={previewResult.droppedItems} /> : null}
          <div className="flex gap-2">
            <button
              onClick={onApply}
              className="flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Apply Changes
            </button>
            <button onClick={onClear} className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100">
              Discard
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
