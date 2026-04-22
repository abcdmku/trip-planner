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
      nameRef.current?.focus();
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-theme bg-theme-elevated p-6 shadow-theme-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-theme-secondary"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-sm">
            <Plane className="h-5 w-5 text-white dark:text-neutral-900" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-theme">New Trip</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="trip-name" className="mb-1 block text-sm font-medium text-theme-secondary">
              Trip Name
            </label>
            <input
              ref={nameRef}
              id="trip-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Summer in Tokyo"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-theme-secondary">
                Start Date
              </label>
              <DateInput
                id="start-date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-theme-secondary">
                End Date
              </label>
              <DateInput
                id="end-date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="timezone" className="mb-1 block text-sm font-medium text-theme-secondary">
              Base Timezone
            </label>
            <select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="input">
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneOptionLabel(tz)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
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
        </form>
      </div>
    </div>
  );
}
