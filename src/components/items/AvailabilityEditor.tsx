import { useMemo } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import {
  parseAvailabilityDateSlots,
  parseAvailabilityWindows,
  serializeAvailabilityDateSlots,
  type AvailabilityDateSlot,
} from '@/lib/availability';

interface AvailabilityEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  defaultDate?: string;
}

function normalizeSlot(slot: AvailabilityDateSlot): AvailabilityDateSlot {
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    repeatDates: (slot.repeatDates ?? []).filter(Boolean),
  };
}

export function AvailabilityEditor({
  value,
  onChange,
  defaultDate,
}: AvailabilityEditorProps) {
  const slots = useMemo(() => parseAvailabilityDateSlots(value), [value]);
  const legacyWindows = useMemo(() => parseAvailabilityWindows(value), [value]);
  const hasLegacyOnly = slots.length === 0 && legacyWindows.length > 0;

  const commit = (nextSlots: AvailabilityDateSlot[]) => {
    onChange(serializeAvailabilityDateSlots(nextSlots.map(normalizeSlot)));
  };

  const handleAddSlot = () => {
    const seedDate = defaultDate ?? new Date().toISOString().slice(0, 10);
    commit([
      ...slots,
      {
        date: seedDate,
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
  };

  const handleSlotChange = (
    index: number,
    key: keyof AvailabilityDateSlot,
    rawValue: string,
  ) => {
    const next = [...slots];
    if (!next[index]) return;

    if (key === 'repeatDates') {
      next[index] = {
        ...next[index],
        repeatDates: rawValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
    } else {
      next[index] = {
        ...next[index],
        [key]: rawValue,
      };
    }
    commit(next);
  };

  const handleDelete = (index: number) => {
    const next = slots.filter((_, i) => i !== index);
    commit(next);
  };

  return (
    <div className="space-y-2 rounded-lg border border-theme bg-theme-subtle p-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary">
          <Clock className="h-3.5 w-3.5" />
          Available Times
        </label>
        <button
          type="button"
          onClick={handleAddSlot}
          className="rounded-md p-1 text-theme-tertiary hover:bg-theme-elevated hover:text-theme"
          aria-label="Add available time"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {hasLegacyOnly && (
        <div className="rounded-md border border-theme bg-theme-elevated p-2 text-[11px] text-theme-secondary">
          <p className="mb-1 font-medium text-theme">Legacy weekly windows detected</p>
          <div className="space-y-0.5">
            {legacyWindows.map((window, index) => (
              <div key={`${window.openTime}-${window.closeTime}-${index}`}>
                {window.dayOfWeek !== undefined ? `D${window.dayOfWeek}` : 'Any day'}:{' '}
                {window.openTime} - {window.closeTime}
              </div>
            ))}
          </div>
          <p className="mt-1 text-theme-tertiary">
            Add a slot below to switch this event to date-specific availability.
          </p>
        </div>
      )}

      {slots.length === 0 && !hasLegacyOnly && (
        <p className="text-[11px] italic text-theme-tertiary">No constraints. Event can be placed anytime.</p>
      )}

      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div key={`${slot.date}-${slot.startTime}-${slot.endTime}-${index}`} className="rounded-md border border-theme bg-theme-elevated p-2">
            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="date"
                value={slot.date}
                onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                className="input w-full py-1 text-xs"
              />
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                className="input w-full py-1 text-xs"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                className="input w-full py-1 text-xs"
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={(slot.repeatDates ?? []).join(', ')}
                onChange={(e) => handleSlotChange(index, 'repeatDates', e.target.value)}
                placeholder="Repeat dates (YYYY-MM-DD, comma-separated)"
                className="input w-full py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-red-500"
                aria-label="Delete available slot"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
