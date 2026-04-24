import { useEffect, useState, type FormEvent } from 'react';
import { Palette, X } from 'lucide-react';
import { DateInput } from '@/component-lib/shared/DateInput';
import type { Day } from '@/types/trip';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { DAY_COLORS } from '@/lib/day-colors';
import { getAutoDayLabel, isDefaultNumberedDayLabel } from '@/lib/day-labels';
import { COMMON_TIMEZONES, formatTimezoneOptionLabel } from '@/lib/timezone';

export interface DayEditorProps {
  day?: Day;
  isOpen: boolean;
  defaultLabel?: string;
  defaultDate?: string;
  baseTimezone?: string;
  onClose: () => void;
  onSave: (day: Partial<Day> & { dayId: string }) => void;
}

export function DayEditor({
  day,
  isOpen,
  defaultLabel = '',
  defaultDate = '',
  baseTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onClose,
  onSave,
}: DayEditorProps) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('22:00');
  const [timezone, setTimezone] = useState(baseTimezone);
  const [labelIsAuto, setLabelIsAuto] = useState(true);
  const timezoneOptions = Array.from(new Set([timezone, baseTimezone, ...COMMON_TIMEZONES]));

  useEffect(() => {
    if (!isOpen) return;

    if (day) {
      setLabel(day.label);
      setDate(day.date);
      setColorHex(day.colorHex);
      setDayStart(day.dayStart);
      setDayEnd(day.dayEnd);
      setTimezone(day.timezone || baseTimezone);
      setLabelIsAuto(
        !day.label.trim() ||
          isDefaultNumberedDayLabel(day.label) ||
          day.label.trim() === getAutoDayLabel(day.date, defaultLabel),
      );
      return;
    }

    setLabel(getAutoDayLabel(defaultDate, defaultLabel));
    setDate(defaultDate);
    setColorHex('#3B82F6');
    setDayStart('08:00');
    setDayEnd('22:00');
    setTimezone(baseTimezone);
    setLabelIsAuto(true);
  }, [baseTimezone, day, defaultDate, defaultLabel, isOpen]);

  useEscapeHotkey(isOpen, onClose);

  if (!isOpen) return null;

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    if (!labelIsAuto) return;
    setLabel(getAutoDayLabel(nextDate, defaultLabel));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resolvedLabel = label.trim() || getAutoDayLabel(date, defaultLabel);
    onSave({
      dayId: day?.dayId ?? crypto.randomUUID(),
      label: resolvedLabel,
      date,
      colorHex,
      dayStart,
      dayEnd,
      timezone,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-4 text-lg font-bold text-theme">{day ? 'Edit Day' : 'Add Day'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="day-label" className="mb-1 block text-sm font-medium text-theme-secondary">
              Label
            </label>
            <input
              id="day-label"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                setLabelIsAuto(false);
              }}
              placeholder="Monday - Arrival"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="day-date" className="mb-1 block text-sm font-medium text-theme-secondary">
              Date
            </label>
            <DateInput
              id="day-date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="day-start" className="mb-1 block text-sm font-medium text-theme-secondary">
                Start
              </label>
              <input id="day-start" type="time" value={dayStart} onChange={(event) => setDayStart(event.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="day-end" className="mb-1 block text-sm font-medium text-theme-secondary">
                End
              </label>
              <input id="day-end" type="time" value={dayEnd} onChange={(event) => setDayEnd(event.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label htmlFor="day-timezone" className="mb-1 block text-sm font-medium text-theme-secondary">
              Timezone
            </label>
            <select
              id="day-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="input"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneOptionLabel(tz)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-theme-secondary">
              <Palette className="h-3.5 w-3.5" /> Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DAY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorHex(color)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    colorHex === color
                      ? 'scale-110 ring-2 ring-theme ring-offset-2 ring-offset-theme-elevated'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-sm font-semibold">
            {day ? 'Save Changes' : 'Add Day'}
          </button>
        </form>
      </div>
    </div>
  );
}
