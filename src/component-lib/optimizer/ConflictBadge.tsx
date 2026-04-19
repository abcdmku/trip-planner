import { AlertTriangle } from 'lucide-react';

export interface ConflictBadgeProps {
  message: string;
}

export function ConflictBadge({ message }: ConflictBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
      <AlertTriangle className="h-3 w-3" />
      {message}
    </span>
  );
}
