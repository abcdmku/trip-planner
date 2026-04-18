import { useState, useEffect } from 'react';
import { X, Palette } from 'lucide-react';
import type { Day } from '../../types/trip';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';
import { getAutoDayLabel, isDefaultNumberedDayLabel } from '@/lib/day-labels';

interface DayEditorProps {
  day?: Day;
  isOpen: boolean;
  defaultLabel?: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: (day: Partial<Day> & { dayId: string }) => void;
}

const DAY_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export function DayEditor({
  day,
  isOpen,
  defaultLabel = '',
  defaultDate = '',
  onClose,
  onSave,
}: DayEditorProps) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('22:00');
  const [labelIsAuto, setLabelIsAuto] = useState(true);

  useEffect(() => {
    if (day) {
      setLabel(day.label);
      setDate(day.date);
      setColorHex(day.colorHex);
      setDayStart(day.dayStart);
      setDayEnd(day.dayEnd);
      setLabelIsAuto(
        !day.label.trim() ||
        isDefaultNumberedDayLabel(day.label) ||
        day.label.trim() === getAutoDayLabel(day.date, defaultLabel),
      );
    } else {
      setLabel(getAutoDayLabel(defaultDate, defaultLabel));
      setDate(defaultDate);
      setColorHex('#3B82F6');
      setDayStart('08:00');
      setDayEnd('22:00');
      setLabelIsAuto(true);
    }
  }, [day, isOpen, defaultDate, defaultLabel]);

  useEscapeHotkey(isOpen, onClose);

  if (!isOpen) return null;

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    if (!labelIsAuto) return;
    setLabel(getAutoDayLabel(nextDate, defaultLabel));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedLabel = label.trim() || getAutoDayLabel(date, defaultLabel);
    onSave({
      dayId: day?.dayId ?? crypto.randomUUID(),
      label: resolvedLabel,
      date,
      colorHex,
      dayStart,
      dayEnd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-4 text-lg font-bold text-theme">
          {day ? 'Edit Day' : 'Add Day'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="day-label" className="mb-1 block text-sm font-medium text-theme-secondary">Label</label>
            <input
              id="day-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setLabelIsAuto(false);
              }}
              placeholder="Monday - Arrival"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="day-date" className="mb-1 block text-sm font-medium text-theme-secondary">Date</label>
            <input
              id="day-date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="day-start" className="mb-1 block text-sm font-medium text-theme-secondary">Start</label>
              <input id="day-start" type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="day-end" className="mb-1 block text-sm font-medium text-theme-secondary">End</label>
              <input id="day-end" type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-theme-secondary">
              <Palette className="h-3.5 w-3.5" /> Color
            </label>
            <div className="flex flex-wrap gap-2">
              {DAY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorHex(c)}
                  className={`h-7 w-7 rounded-full transition-all ${colorHex === c ? 'ring-2 ring-theme ring-offset-2 ring-offset-theme-elevated scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-2.5 text-sm font-semibold"
          >
            {day ? 'Save Changes' : 'Add Day'}
          </button>
        </form>
      </div>
    </div>
  );
}
