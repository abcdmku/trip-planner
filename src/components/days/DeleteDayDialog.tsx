import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';

interface DeleteDayDialogProps {
  isOpen: boolean;
  dayLabel: string;
  eventCount: number;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteDayDialog({
  isOpen,
  dayLabel,
  eventCount,
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteDayDialogProps) {
  useEscapeHotkey(isOpen && !isDeleting, onCancel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-day-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isDeleting ? undefined : onCancel} />

      <div className="relative w-full max-w-md rounded-2xl border border-theme bg-theme-elevated p-6 shadow-theme-2xl">
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute right-3 top-3 rounded-lg p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 id="delete-day-title" className="text-lg font-bold text-theme">
              Delete {dayLabel}?
            </h3>
            <p className="mt-1 text-sm text-theme-secondary">
              {eventCount > 0
                ? `This day has ${eventCount} event${eventCount === 1 ? '' : 's'}. Deleting it will also remove those events and related routes.`
                : 'This action cannot be undone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-theme px-3 py-2 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Day
          </button>
        </div>
      </div>
    </div>
  );
}

