import { Globe } from 'lucide-react';

interface TimezoneBadgeProps {
  timezone: string;
  baseTimezone?: string;
  showFull?: boolean;
}

function abbreviate(tz: string): string {
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

export function TimezoneBadge({ timezone, baseTimezone, showFull = false }: TimezoneBadgeProps) {
  const isDifferent = baseTimezone && timezone !== baseTimezone;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        isDifferent
          ? 'bg-violet-50 text-violet-600 ring-1 ring-violet-200'
          : 'bg-stone-100 text-stone-500'
      }`}
      title={timezone}
    >
      <Globe className="h-2.5 w-2.5" />
      {showFull ? timezone.replace(/_/g, ' ') : abbreviate(timezone)}
    </span>
  );
}
