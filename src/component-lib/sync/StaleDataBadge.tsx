import { AlertCircle } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

export interface StaleDataBadgeProps {
  message?: string;
}

export function StaleDataBadge({ message = 'Data may be outdated' }: StaleDataBadgeProps) {
  return (
    <StatusMessage
      label={message}
      tone="warning"
      variant="badge"
      icon={<AlertCircle className="h-3 w-3" />}
    />
  );
}
