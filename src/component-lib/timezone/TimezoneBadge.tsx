import { Globe } from 'lucide-react';
import { getTimezoneAbbr } from '@/lib/timezone';

export interface TimezoneBadgeProps {
  timezone: string;
  baseTimezone?: string;
  date?: string;
  variant?: 'default' | 'embedded' | 'onColor';
  showFull?: boolean;
}

function toReferenceDate(date?: string): Date {
  return date ? new Date(`${date}T12:00:00.000Z`) : new Date();
}

export function TimezoneBadge({
  timezone,
  baseTimezone,
  date,
  variant = 'default',
  showFull = false,
}: TimezoneBadgeProps) {
  const isDifferent = baseTimezone && timezone !== baseTimezone;
  const badgeLabel = showFull ? timezone.replace(/_/g, ' ') : getTimezoneAbbr(timezone, toReferenceDate(date));
  const className =
    variant === 'onColor'
      ? 'border-transparent bg-transparent text-white/75'
      : variant === 'embedded'
        ? 'border-transparent bg-transparent text-theme-tertiary'
        : isDifferent
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-theme bg-theme-subtle text-theme-tertiary';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${className}`}
      title={timezone}
    >
      {showFull ? <Globe className="h-2.5 w-2.5" /> : null}
      {badgeLabel}
    </span>
  );
}
