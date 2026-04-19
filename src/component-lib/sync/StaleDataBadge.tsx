import { AlertCircle } from 'lucide-react';

export interface StaleDataBadgeProps {
  message?: string;
}

export function StaleDataBadge({ message = 'Data may be outdated' }: StaleDataBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
      <AlertCircle className="h-3 w-3" />
      {message}
    </span>
  );
}
