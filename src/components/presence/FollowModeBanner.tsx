import { EyeOff } from 'lucide-react';

interface FollowModeBannerProps {
  name: string;
  onExit: () => void;
}

export function FollowModeBanner({ name, onExit }: FollowModeBannerProps) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs shadow-theme-sm">
      <span className="whitespace-nowrap font-semibold uppercase tracking-[0.18em] text-accent">
        Follow Mode
      </span>
      <span className="max-w-28 truncate text-theme-secondary">Following {name}</span>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex items-center gap-1 rounded-full border border-theme/70 bg-theme-elevated px-2 py-1 font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
      >
        <EyeOff className="h-3.5 w-3.5" />
        Stop
      </button>
    </div>
  );
}
