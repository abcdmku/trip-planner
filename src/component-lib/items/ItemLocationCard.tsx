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
  const rootClassName = `group/stop relative min-w-0 ${
    isInteractive ? 'block w-full' : ''
  }`;
  const surfaceClassName = `w-full rounded-xl border border-theme bg-theme px-3 py-2.5 text-left ${
    isInteractive
      ? 'transition-colors hover:bg-theme-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-accent),0.25)]'
      : ''
  } ${paddedForActions ? 'pr-12' : ''}`;

  const body = (
    <>
      <p className="truncate text-[13px] font-semibold text-theme">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-theme-tertiary">
          {subtitleIcon ?? <MapPin className="h-3 w-3 shrink-0" />}
          <span className="truncate">{subtitle}</span>
        </p>
      ) : null}
      {description ? <p className="mt-0.5 text-[11px] text-theme-tertiary">{description}</p> : null}
    </>
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
      {actions ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{actions}</div> : null}
    </div>
  );
}
