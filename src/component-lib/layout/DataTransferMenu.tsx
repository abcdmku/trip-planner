import { useRef } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';

export type DataTransferStatus = 'idle' | 'exporting' | 'loading' | 'success' | 'error';

export interface DataTransferMenuProps {
  status?: DataTransferStatus;
  message?: string | null;
  disabled?: boolean;
  onExportData?: () => void | Promise<void>;
  onLoadData?: (file: File) => void | Promise<void>;
}

const STATUS_COPY: Record<Exclude<DataTransferStatus, 'idle'>, string> = {
  exporting: 'Exporting data...',
  loading: 'Loading data...',
  success: 'Data updated.',
  error: 'Unable to update data.',
};

export function DataTransferMenu({
  status = 'idle',
  message,
  disabled = false,
  onExportData,
  onLoadData,
}: DataTransferMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = status === 'exporting' || status === 'loading';
  const controlsDisabled = disabled || isBusy;
  const statusMessage = message ?? (status === 'idle' ? null : STATUS_COPY[status]);
  const StatusIcon =
    status === 'error'
      ? AlertCircle
      : status === 'success'
        ? CheckCircle2
        : isBusy
          ? Loader2
          : null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
        Data
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExportData}
          disabled={controlsDisabled || !onExportData}
          className="flex min-h-10 items-center justify-center gap-2 rounded-theme-control border border-theme bg-theme px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === 'exporting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={controlsDisabled || !onLoadData}
          className="flex min-h-10 items-center justify-center gap-2 rounded-theme-control border border-theme bg-theme px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-55"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>Load</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          void onLoadData?.(file);
        }}
      />

      {statusMessage ? (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`flex items-start gap-1.5 text-xs ${
            status === 'error'
              ? 'text-red-500'
              : status === 'success'
                ? 'text-emerald-600'
                : 'text-theme-tertiary'
          }`}
        >
          {StatusIcon ? (
            <StatusIcon className={`mt-0.5 h-3.5 w-3.5 flex-none ${isBusy ? 'animate-spin' : ''}`} />
          ) : null}
          <span>{statusMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
