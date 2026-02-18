import { CalendarDays, ChevronLeft, ChevronRight, Link2, Link2Off } from 'lucide-react';
import type { ViewMode } from './types';

interface TimelineViewControlsProps {
  viewMode: ViewMode;
  showPrev: boolean;
  showNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onModeChange: (mode: ViewMode) => void;
  /** Whether auto-connect lines are shown */
  showConnectors?: boolean;
  /** Callback to toggle auto-connect */
  onToggleConnectors?: () => void;
}

export function TimelineViewControls({
  viewMode,
  showPrev,
  showNext,
  onPrev,
  onNext,
  onModeChange,
  showConnectors = true,
  onToggleConnectors,
}: TimelineViewControlsProps) {
  return (
    <div className="flex items-center justify-between border-b border-theme bg-theme-elevated px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-theme-tertiary">
        <CalendarDays className="h-3.5 w-3.5" />
        Timeline
      </div>

      <div className="flex items-center gap-1.5">
        {onToggleConnectors && (
          <button
            type="button"
            onClick={onToggleConnectors}
            title={showConnectors ? 'Hide connection lines' : 'Show connection lines'}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
              showConnectors
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-theme text-theme-tertiary hover:bg-theme-subtle hover:text-theme'
            }`}
          >
            {showConnectors ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
          </button>
        )}

        {viewMode === 'day' && (
          <div className="inline-flex overflow-hidden rounded-md border border-theme">
            <button
              type="button"
              onClick={onPrev}
              disabled={!showPrev}
              className="flex h-7 w-7 items-center justify-center text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!showNext}
              className="flex h-7 w-7 items-center justify-center border-l border-theme text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="inline-flex rounded-md border border-theme bg-theme p-0.5">
          <button
            type="button"
            onClick={() => onModeChange('day')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-theme-elevated text-theme shadow-theme-sm'
                : 'text-theme-secondary hover:text-theme'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onModeChange('multi')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'multi'
                ? 'bg-theme-elevated text-theme shadow-theme-sm'
                : 'text-theme-secondary hover:text-theme'
            }`}
          >
            Multi
          </button>
        </div>
      </div>
    </div>
  );
}
