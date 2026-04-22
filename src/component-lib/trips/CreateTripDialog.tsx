import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Plane, X } from 'lucide-react';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { DateInput } from '@/component-lib/shared/DateInput';
import { COMMON_TIMEZONES, formatTimezoneOptionLabel } from '@/lib/timezone';

export interface CreateTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, startDate: string, endDate: string, timezone: string) => void;
}

export function CreateTripDialog({ isOpen, onClose, onCreate }: CreateTripDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const timezoneOptions = Array.from(new Set([timezone, ...COMMON_TIMEZONES]));

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        nameRef.current?.focus();
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setStartDate('');
      setEndDate('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEscapeHotkey(isOpen, onClose);

  const hasInvalidDateRange = Boolean(startDate && endDate && endDate < startDate);
  const isValid = name.trim().length > 0 && startDate && endDate && endDate >= startDate;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    onCreate(name.trim(), startDate, endDate, timezone);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-theme-shell border border-theme bg-theme-elevated px-5 pb-5 pt-4 shadow-theme-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-theme-control bg-theme text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-theme"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 pr-10">
            <div className="space-y-1">
              <label htmlFor="trip-name" className="sr-only">
                Trip Name
              </label>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-theme-tertiary">
                <Plane className="h-3.5 w-3.5" />
                Trip
              </div>
              <input
                ref={nameRef}
                id="trip-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New Trip"
                className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-theme outline-none placeholder:text-theme-tertiary focus-visible:ring-0"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary"
                  >
                    Start Date
                  </label>
                  <DateInput
                    id="start-date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    aria-invalid={hasInvalidDateRange}
                    aria-describedby={hasInvalidDateRange ? 'trip-date-range-error' : undefined}
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      hasInvalidDateRange ? 'text-red-400' : 'text-theme-tertiary'
                    }`}
                  >
                    End Date
                  </label>
                  <DateInput
                    id="end-date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    aria-invalid={hasInvalidDateRange}
                    aria-describedby={hasInvalidDateRange ? 'trip-date-range-error' : undefined}
                    className={hasInvalidDateRange ? 'border-red-500/60 focus:border-red-500 focus:shadow-none' : ''}
                  />
                </div>
              </div>
              {hasInvalidDateRange ? (
                <p id="trip-date-range-error" className="text-xs leading-5 text-red-400">
                  End date must be the same day or later than the start date.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary"
              >
                Base Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="input w-full"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {formatTimezoneOptionLabel(tz)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-theme-control px-4 text-sm font-semibold shadow-theme-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trip'
              )}
            </button>
            <p className="text-center text-xs leading-5 text-theme-tertiary">
              You can update the trip name, dates, and timezone later.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
