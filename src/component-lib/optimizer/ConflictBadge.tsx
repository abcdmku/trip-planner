import { AlertTriangle } from 'lucide-react';
import { StatusMessage } from '@/component-lib/sync/StatusMessage';

export interface ConflictBadgeProps {
  message: string;
}

export function ConflictBadge({ message }: ConflictBadgeProps) {
  return (
    <StatusMessage
      label={message}
      tone="danger"
      variant="badge"
      icon={<AlertTriangle className="h-3 w-3" />}
    />
  );
}
