import { RefreshCw, X } from 'lucide-react';

export interface ConflictBannerProps {
  message: string;
  onReload?: () => void;
  onDismiss?: () => void;
}

export function ConflictBanner({ message, onReload, onDismiss }: ConflictBannerProps) {
  const normalizedDetail = message
    .replace(/^Remote edits were detected\.?\s*/i, '')
    .trim();

  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-400/55 bg-[rgba(245,158,11,0.18)] px-4 py-3 text-theme shadow-[0_10px_28px_rgba(245,158,11,0.12)] dark:border-amber-300/40 dark:bg-[rgba(251,191,36,0.16)]"
    >
      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.55)] text-amber-700 dark:bg-[rgba(23,23,23,0.28)] dark:text-amber-200">
        <RefreshCw className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1 basis-52">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Remote edits were detected
        </p>
        {normalizedDetail ? (
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-50/88">
            {normalizedDetail}
          </p>
        ) : null}
      </div>

      {(onReload || onDismiss) ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          {onReload ? (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1 rounded-full border border-amber-900/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-white dark:border-amber-50/15 dark:bg-black/10 dark:text-amber-50 dark:hover:bg-black/20"
            >
              <RefreshCw className="h-3 w-3" />
              Reload
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-900/15 bg-white/45 text-amber-900 transition-colors hover:bg-white/70 dark:border-amber-50/15 dark:bg-black/10 dark:text-amber-50 dark:hover:bg-black/20"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
