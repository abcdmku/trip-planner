import { AlertTriangle, Check, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatusMessageTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type StatusMessageVariant = 'inline' | 'badge' | 'banner';

export interface StatusMessageProps {
  label: string;
  detail?: string;
  tone?: StatusMessageTone;
  variant?: StatusMessageVariant;
  icon?: ReactNode;
  actions?: ReactNode;
}

const TONE_STYLES: Record<StatusMessageTone, string> = {
  neutral: 'border-theme bg-theme text-theme-secondary',
  info: 'border-[rgba(var(--color-accent),0.18)] bg-[rgba(var(--color-accent),0.10)] text-accent',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300',
};

function DefaultToneIcon({ tone }: { tone: StatusMessageTone }) {
  const Icon: LucideIcon =
    tone === 'success' ? Check : tone === 'danger' || tone === 'warning' ? AlertTriangle : Info;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

export function StatusMessage({
  label,
  detail,
  tone = 'neutral',
  variant = 'inline',
  icon,
  actions,
}: StatusMessageProps) {
  const resolvedIcon = icon ?? <DefaultToneIcon tone={tone} />;
  const toneStyles = TONE_STYLES[tone];

  if (variant === 'banner') {
    return (
      <div className={`flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3 ${toneStyles}`} role="alert">
        <div className="mt-0.5 shrink-0">{resolvedIcon}</div>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-semibold">{label}</p>
          {detail ? <p className="mt-1 text-xs opacity-90">{detail}</p> : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    );
  }

  const wrapperClassName =
    variant === 'badge'
      ? `inline-flex max-w-full min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles}`
      : `inline-flex max-w-full min-w-0 items-center gap-1.5 whitespace-nowrap text-xs ${toneStyles.replace(/border-[^ ]+|bg-[^ ]+/g, '').trim()}`;

  return (
    <span className={wrapperClassName}>
      <span className="shrink-0">{resolvedIcon}</span>
      <span className="min-w-0 truncate">{label}</span>
      {detail ? <span className="min-w-0 max-w-[12ch] truncate text-theme-tertiary">{detail}</span> : null}
      {actions ? <span className="ml-1 inline-flex shrink-0 items-center gap-1">{actions}</span> : null}
    </span>
  );
}
