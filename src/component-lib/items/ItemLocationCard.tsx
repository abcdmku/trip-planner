import { MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ItemLocationCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  onClick?: () => void;
  ariaLabel?: string;
  actions?: ReactNode;
  subtitleIcon?: ReactNode;
  paddedForActions?: boolean;
}

export function ItemLocationCard({
  title,
  subtitle,
  description,
  onClick,
  ariaLabel,
  actions,
  subtitleIcon,
  paddedForActions = false,
}: ItemLocationCardProps) {
  const isInteractive = Boolean(onClick);
  const rootClassName = 'group/stop flex min-w-0 items-start gap-2';
  const surfaceClassName = `min-w-0 flex-1 rounded-xl border border-theme bg-theme px-3 py-2.5 text-left ${
    isInteractive
      ? 'transition-colors hover:bg-theme-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent),0.25)]'
      : ''
  } ${paddedForActions && !actions ? 'pr-12' : ''}`;

  const body = (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-semibold text-theme">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-theme-tertiary">
          {subtitleIcon ?? <MapPin className="h-3 w-3 shrink-0" />}
          <span className="truncate">{subtitle}</span>
        </p>
      ) : null}
      {description ? <p className="mt-0.5 text-[11px] text-theme-tertiary">{description}</p> : null}
    </div>
  );

  return (
    <div className={rootClassName}>
      {isInteractive ? (
        <button type="button" onClick={onClick} className={surfaceClassName} aria-label={ariaLabel}>
          {body}
        </button>
      ) : (
        <div className={surfaceClassName}>{body}</div>
      )}
      {actions ? <div className="flex shrink-0 items-center gap-1 pt-1">{actions}</div> : null}
    </div>
  );
}
