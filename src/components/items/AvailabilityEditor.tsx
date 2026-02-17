import { useState } from 'react';
import { Plus, X, Clock } from 'lucide-react';
import type { AvailabilityWindow } from '../../lib/availability';

interface AvailabilityEditorProps {
  windows: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailabilityEditor({ windows, onChange }: AvailabilityEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDay, setNewDay] = useState<number | undefined>(undefined);
  const [newOpen, setNewOpen] = useState('09:00');
  const [newClose, setNewClose] = useState('17:00');

  const handleAdd = () => {
    onChange([...windows, { dayOfWeek: newDay, openTime: newOpen, closeTime: newClose }]);
    setIsAdding(false);
    setNewDay(undefined);
    setNewOpen('09:00');
    setNewClose('17:00');
  };

  const handleRemove = (index: number) => {
    onChange(windows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
          <Clock className="h-3 w-3" />
          Availability Windows
        </label>
        <button
          onClick={() => setIsAdding(true)}
          className="rounded p-0.5 text-stone-300 hover:bg-stone-100 hover:text-amber-600"
          aria-label="Add window"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {windows.length === 0 && !isAdding && (
        <p className="text-xs text-stone-400 italic">No constraints — available anytime</p>
      )}

      {windows.map((w, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-stone-50 px-2 py-1.5">
          <span className="text-xs text-stone-600">
            {w.dayOfWeek !== undefined ? DAYS_OF_WEEK[w.dayOfWeek] : 'Any day'}
          </span>
          <span className="text-xs font-medium text-stone-700">
            {w.openTime} – {w.closeTime}
          </span>
          <button
            onClick={() => handleRemove(i)}
            className="ml-auto rounded p-0.5 text-stone-300 hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {isAdding && (
        <div className="space-y-2 rounded-lg border border-stone-200 bg-white p-2">
          <select
            value={newDay ?? ''}
            onChange={(e) => setNewDay(e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-full rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-amber-400"
          >
            <option value="">Any day</option>
            {DAYS_OF_WEEK.map((day, i) => (
              <option key={i} value={i}>{day}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="time" value={newOpen} onChange={(e) => setNewOpen(e.target.value)} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-amber-400" />
            <span className="text-xs text-stone-400 self-center">to</span>
            <input type="time" value={newClose} onChange={(e) => setNewClose(e.target.value)} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-amber-400" />
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd} className="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600">Add</button>
            <button onClick={() => setIsAdding(false)} className="rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
