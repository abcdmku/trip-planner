import { useState } from 'react';
import {
  Bed,
  Bus,
  ChevronDown,
  Clock3,
  Landmark,
  Loader2,
  Lock,
  LockOpen,
  MapPin,
  StickyNote,
  Target,
  Timer,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { AvailabilityEditor } from './AvailabilityEditor';
import { toMinutesOfDay } from '@/lib/date-time';
import { minutesToTime } from '@/lib/optimizer-utils';
import {
  parseAvailabilityEntries,
  parseAvailabilityDateSlots,
  parseAvailabilityWindows,
  type AvailabilityWindow,
} from '@/lib/availability';

export interface EventEditorValue {
  type: ItemType;
  transportMode: TransportMode;
  itemRouteType: RouteType;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  notesMd: string;
  availabilityWindows: string;
  timelineLocked: boolean;
}

interface EventEditorFormProps {
  value: EventEditorValue;
  onChange: (next: EventEditorValue) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  defaultDate?: string;
  compact?: boolean;
  mapsAvailabilityWindows?: AvailabilityWindow[];
}

const ITEM_TYPES: { value: ItemType; label: string; icon: LucideIcon }[] = [
  { value: 'attraction', label: 'Attraction', icon: Landmark },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { value: 'hotel', label: 'Hotel', icon: Bed },
  { value: 'transport', label: 'Transport', icon: Bus },
  { value: 'activity', label: 'Activity', icon: Target },
  { value: 'other', label: 'Other', icon: MapPin },
];

function durationFromStartEnd(startTime: string, endTime: string): number | null {
  const startMin = toMinutesOfDay(startTime);
  const endMin = toMinutesOfDay(endTime);
  if (startMin === null || endMin === null) return null;
  return Math.max(0, endMin - startMin);
}

function endFromStartDuration(startTime: string, durationMinutes: number): string | null {
  const startMin = toMinutesOfDay(startTime);
  if (startMin === null) return null;
  return minutesToTime(startMin + Math.max(0, durationMinutes));
}

function clampEndToStart(startTime: string, endTime: string): string {
  const startMin = toMinutesOfDay(startTime);
  const endMin = toMinutesOfDay(endTime);
  if (startMin === null || endMin === null) return endTime;
  return endMin < startMin ? minutesToTime(startMin) : endTime;
}

function clampDurationWithinDay(startTime: string, durationMinutes: number): number {
  const startMin = toMinutesOfDay(startTime);
  const nextDuration = Math.max(0, durationMinutes);
  if (startMin === null) return nextDuration;
  const maxDuration = Math.max(0, 23 * 60 + 59 - startMin);
  return Math.min(nextDuration, maxDuration);
}

function getAvailabilityBadge(value: string): string {
  const entries = parseAvailabilityEntries(value);
  if (entries.length > 0) {
    const weeklyEntries = entries.filter((entry) => entry.kind === 'weekly');
    const dateEntries = entries.filter((entry) => entry.kind === 'date');

    if (weeklyEntries.length > 0 && dateEntries.length > 0) {
      return `${weeklyEntries.length} weekly, ${dateEntries.length} date`;
    }
  }

  const dateSlots = parseAvailabilityDateSlots(value);
  if (dateSlots.length > 0) {
    return `${dateSlots.length} date slot${dateSlots.length !== 1 ? 's' : ''}`;
  }

  const windows = parseAvailabilityWindows(value);
  if (windows.length === 0) return 'No restrictions';

  const uniqueTimes = new Set(windows.map((w) => `${w.openTime}-${w.closeTime}`));
  if (uniqueTimes.size === 1) {
    const timeStr = [...uniqueTimes][0];
    const daysActive = new Set(windows.map((w) => w.dayOfWeek));
    if (daysActive.size === 7 || windows.some((w) => w.dayOfWeek === undefined)) {
      return `Daily ${timeStr}`;
    }
    return `${daysActive.size} days ${timeStr}`;
  }

  return `${windows.length} time windows`;
}

export function EventEditorForm({
  value,
  onChange,
  onSubmit,
  submitLabel = 'Save Event',
  isSubmitting = false,
  submitDisabled = false,
  defaultDate,
  compact = false,
  mapsAvailabilityWindows,
}: EventEditorFormProps) {
  const availabilityBadge = getAvailabilityBadge(value.availabilityWindows);
  const hasAvailabilityConstraints = availabilityBadge !== 'No restrictions';
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(hasAvailabilityConstraints);

  const set = <K extends keyof EventEditorValue>(key: K, nextValue: EventEditorValue[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  const handleEndChange = (nextEnd: string) => {
    const normalizedEnd = clampEndToStart(value.scheduledStart, nextEnd);
    const next: EventEditorValue = { ...value, scheduledEnd: normalizedEnd };
    const nextDuration = durationFromStartEnd(next.scheduledStart, normalizedEnd);
    if (nextDuration !== null) {
      next.durationMinutes = nextDuration;
    }
    onChange(next);
  };

  const handleStartChange = (nextStart: string) => {
    const next: EventEditorValue = { ...value, scheduledStart: nextStart };

    if (next.scheduledEnd) {
      next.scheduledEnd = clampEndToStart(nextStart, next.scheduledEnd);
      const nextDuration = durationFromStartEnd(nextStart, next.scheduledEnd);
      if (nextDuration !== null) {
        next.durationMinutes = nextDuration;
      }
    } else {
      next.durationMinutes = clampDurationWithinDay(nextStart, next.durationMinutes);
    }

    onChange(next);
  };

  const handleDurationChange = (rawDuration: string) => {
    const nextDuration = clampDurationWithinDay(value.scheduledStart, Number(rawDuration) || 0);
    const next: EventEditorValue = { ...value, durationMinutes: nextDuration };
    const nextEnd = endFromStartDuration(next.scheduledStart, nextDuration);
    if (nextEnd !== null) {
      next.scheduledEnd = nextEnd;
    }
    onChange(next);
  };

  const typeButton = (active: boolean) =>
    `inline-flex h-10 w-full items-center gap-2 rounded-lg border px-2.5 text-left text-[11px] font-semibold transition-colors ${
      active
        ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.12)] text-accent'
        : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
    }`;

  return (
    <div className="space-y-3.5">
      <div>
        <div className="mb-2.5 text-[13px] font-medium text-theme-secondary">Type</div>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Event type">
          {ITEM_TYPES.map((option) => {
            const active = value.type === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => set('type', option.value)}
                className={typeButton(active)}
                aria-pressed={active}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    active ? 'bg-accent/12' : 'bg-theme-subtle'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-theme-subtle pt-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-theme-secondary">
            <Clock3 className="h-4 w-4 text-theme-tertiary" />
            <span>Time</span>
          </div>
          <button
            type="button"
            onClick={() => set('timelineLocked', !value.timelineLocked)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              value.timelineLocked
                ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.12)] text-accent'
                : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
            }`}
            aria-pressed={value.timelineLocked}
            title={value.timelineLocked ? 'Timeline position locked' : 'Timeline position editable'}
          >
            {value.timelineLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            <span>{value.timelineLocked ? 'Locked' : 'Flexible'}</span>
          </button>
        </div>

        <div
          className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_104px]'}`}
        >
          <div>
            <label className="mb-0.5 block text-[10px] text-theme-tertiary">Start</label>
            <input
              type="time"
              value={value.scheduledStart}
              onChange={(e) => handleStartChange(e.target.value)}
              className="input w-full py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] text-theme-tertiary">End</label>
            <input
              type="time"
              value={value.scheduledEnd}
              onChange={(e) => handleEndChange(e.target.value)}
              min={value.scheduledStart || undefined}
              className="input w-full py-1.5 text-xs"
            />
          </div>

          <div className={`relative ${compact ? 'col-span-2' : ''}`}>
            <label className="mb-0.5 block text-[10px] text-theme-tertiary">Duration</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={5}
                value={value.durationMinutes}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="input w-full py-1.5 pr-12 text-xs"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center gap-1 text-[10px] text-theme-tertiary">
                <Timer className="h-3 w-3" />
                <span>min</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-theme-subtle pt-3.5">
        <button
          type="button"
          onClick={() => setIsAvailabilityOpen((open) => !open)}
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={isAvailabilityOpen}
        >
          <Clock3 className="h-4 w-4 text-theme-tertiary" />
          <span className="text-[13px] font-medium text-theme-secondary">Availability</span>
          <span className="flex-1" />
          <span className="max-w-[180px] truncate text-right text-[11px] text-theme-tertiary">
            {availabilityBadge}
          </span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-theme-tertiary transition-transform ${
              isAvailabilityOpen ? '' : '-rotate-90'
            }`}
          />
        </button>

        {isAvailabilityOpen ? (
          <div className="mt-2">
            <AvailabilityEditor
              value={value.availabilityWindows}
              onChange={(next) => set('availabilityWindows', next)}
              defaultDate={defaultDate}
              mapsAvailabilityWindows={mapsAvailabilityWindows}
              flat
            />
          </div>
        ) : null}
      </div>

      <div className="border-t border-theme-subtle pt-3.5">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-theme-secondary">
          <StickyNote className="h-4 w-4 text-theme-tertiary" />
          <span>Notes</span>
        </div>
        <textarea
          value={value.notesMd}
          onChange={(e) => set('notesMd', e.target.value)}
          className="input w-full resize-none py-1.5 text-xs leading-relaxed"
          rows={2}
          placeholder="Add notes"
        />
      </div>

      {onSubmit ? (
        <div className="border-t border-theme-subtle pt-3.5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
