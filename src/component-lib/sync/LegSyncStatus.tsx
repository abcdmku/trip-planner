import { Check, RefreshCw, Route } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

export interface LegSyncStatusProps {
  isCalculating: boolean;
  totalLegs: number;
  staleCount: number;
}

export function LegSyncStatus({ isCalculating, totalLegs, staleCount }: LegSyncStatusProps) {
  if (isCalculating) {
    return (
      <StatusMessage
        label="Calculating routes"
        tone="info"
        variant="inline"
        icon={<RefreshCw className="h-3.5 w-3.5 animate-spin" />}
      />
    );
  }

  if (staleCount > 0) {
    return (
      <StatusMessage
        label={`${staleCount} route${staleCount !== 1 ? 's' : ''} need recalculation`}
        tone="warning"
        variant="inline"
        icon={<Route className="h-3.5 w-3.5" />}
      />
    );
  }

  return (
    <StatusMessage
      label={`${totalLegs} route${totalLegs !== 1 ? 's' : ''} up to date`}
      tone="success"
      variant="inline"
      icon={<Check className="h-3.5 w-3.5" />}
    />
  );
}
