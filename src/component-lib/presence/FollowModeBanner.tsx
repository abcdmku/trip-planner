import { EyeOff, LocateFixed } from 'lucide-react';

export interface FollowModeBannerProps {
  name: string;
  contextLabel?: string;
  onExit: () => void;
}

export function FollowModeBanner({
  name,
  contextLabel = 'Live view',
  onExit,
}: FollowModeBannerProps) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1.5 text-xs shadow-theme-sm">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
        <LocateFixed className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 truncate font-medium text-theme">
        Following {name}
        <span className="text-theme-tertiary"> / {contextLabel}</span>
      </span>
      <button
        type="button"
        onClick={onExit}
        aria-label={`Stop following ${name}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-theme/70 bg-theme-elevated text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
