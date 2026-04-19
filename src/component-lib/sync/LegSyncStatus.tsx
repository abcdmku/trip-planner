import { Check, RefreshCw, Route } from 'lucide-react';

export interface LegSyncStatusProps {
  isCalculating: boolean;
  totalLegs: number;
  staleCount: number;
}

export function LegSyncStatus({ isCalculating, totalLegs, staleCount }: LegSyncStatusProps) {
  if (isCalculating) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Calculating routes...
      </span>
    );
  }

  if (staleCount > 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-500">
        <Route className="h-3 w-3" />
        {staleCount} route{staleCount !== 1 ? 's' : ''} need recalculation
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
      <Check className="h-3 w-3" />
      {totalLegs} route{totalLegs !== 1 ? 's' : ''} up to date
    </span>
  );
}
