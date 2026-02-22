import { useState, type ReactNode } from 'react';
import {
  Lock,
  LockOpen,
  Loader2,
  Timer,
  Clock3,
  StickyNote,
  ChevronDown,
} from 'lucide-react';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { AvailabilityEditor } from '@/components/items/AvailabilityEditor';
import { toMinutesOfDay } from '@/lib/date-time';
import { minutesToTime } from '@/lib/optimizer-utils';
import {
  parseAvailabilityWindows,
  parseAvailabilityDateSlots,
  type AvailabilityWindow,
} from '@/lib/availability';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_TYPES: { value: ItemType; label: string; emoji: string }[] = [
  { value: 'attraction', label: 'Attraction', emoji: '\u{1F3DB}\uFE0F' },
  { value: 'restaurant', label: 'Restaurant', emoji: '\u{1F37D}\uFE0F' },
  { value: 'hotel', label: 'Hotel', emoji: '\u{1F3E8}' },
  { value: 'transport', label: 'Transport', emoji: '\u{1F68C}' },
  { value: 'activity', label: 'Activity', emoji: '\u{1F3AF}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4CD}' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Badge summary helpers (shown on collapsed section headers)
// ---------------------------------------------------------------------------

function getAvailabilityBadge(value: string): string {
  const dateSlots = parseAvailabilityDateSlots(value);
  if (dateSlots.length > 0) {
    return `${dateSlots.length} date slot${dateSlots.length !== 1 ? 's' : ''}`;
  }
  const windows = parseAvailabilityWindows(value);
  if (windows.length === 0) return 'No restrictions';
  const uniqueTimes = new Set(windows.map((w) => `${w.openTime}\u2013${w.closeTime}`));
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

function getScheduleBadge(v: EventEditorValue): string | undefined {
  const parts: string[] = [];
  if (v.scheduledStart) {
    parts.push(v.scheduledStart + (v.scheduledEnd ? ` \u2013 ${v.scheduledEnd}` : ''));
  }
  if (v.durationMinutes > 0) parts.push(`${v.durationMinutes}m`);
  if (v.timelineLocked) parts.push('Locked');
  return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
}

// ---------------------------------------------------------------------------
// Collapsible section — borderless, icon-in-square header
// ---------------------------------------------------------------------------

function SectionCard({
  label,
  icon: Icon,
  badge,
  hasData = false,
  defaultOpen = false,
  headerExtra,
  children,
  compact = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  hasData?: boolean;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const highlighted = !open && hasData;

  return (
    <div className="rounded-xl border border-theme bg-theme-elevated">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard handled via onKeyDown */}
      <div
        onClick={() => setOpen(!open)}
        className="group/hdr flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-theme-subtle"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
      >
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
          highlighted
            ? 'bg-accent/15 text-accent'
            : open
              ? 'bg-theme-subtle text-theme-secondary'
              : 'bg-theme-subtle text-theme-secondary'
        }`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className={`text-[13px] font-medium transition-colors ${
          highlighted ? 'text-accent' : 'text-theme-secondary'
        }`}>{label}</span>
        <span className="flex-1" />
        {!open && badge && (
          <span className={`max-w-[45%] truncate text-[11px] tabular-nums ${
            highlighted ? 'text-accent' : 'text-theme-tertiary'
          }`}>{badge}</span>
        )}
        {headerExtra && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="flex items-center">
            {headerExtra}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 shrink-0 text-theme-tertiary transition-transform duration-200 ${
          open ? '' : '-rotate-90'
        }`} />
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className={`${open ? 'overflow-visible' : 'overflow-hidden'} border-t border-theme-subtle`}>
          <div className={`${compact ? 'space-y-2 p-2.5' : 'space-y-2 p-3'}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  const tile = (active: boolean) =>
    `flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${
      active
        ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.12)] text-accent'
        : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
    }`;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {/* ── Type selector ── */}
      <div className="rounded-xl border border-theme bg-theme-elevated p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-theme-secondary">Type</span>
          <span className="text-[11px] text-theme-tertiary">Categorize this stop</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ITEM_TYPES.map((option) => {
            const active = value.type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => set('type', option.value)}
                className={tile(active)}
                aria-pressed={active}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    active ? 'bg-accent/15' : 'bg-theme-subtle'
                  }`}
                >
                  <span className="text-sm">{option.emoji}</span>
                </span>
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Schedule + Timeline lock ── */}
      <SectionCard
        label="Time"
        icon={Clock3}
        badge={getScheduleBadge(value)}
        hasData={Boolean(value.scheduledStart || value.durationMinutes > 0 || value.timelineLocked)}
        defaultOpen
        compact={compact}
      >
        <button
          type="button"
          onClick={() => set('timelineLocked', !value.timelineLocked)}
          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
            value.timelineLocked
              ? 'border-[rgba(var(--color-accent),0.35)] bg-[rgba(var(--color-accent),0.12)] text-accent'
              : 'border-theme bg-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
          }`}
          aria-pressed={value.timelineLocked}
          title={value.timelineLocked ? 'Timeline position locked' : 'Timeline position editable'}
        >
          <span className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                value.timelineLocked ? 'bg-accent/15' : 'bg-theme-subtle'
              }`}
            >
              {value.timelineLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            </span>
            Lock on timeline
          </span>
          <span className="text-[11px] font-semibold tabular-nums">
            {value.timelineLocked ? 'Locked' : 'Unlocked'}
          </span>
        </button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <div>
            <label className="mb-0.5 block text-[10px] text-theme-tertiary">Start</label>
            <input
              type="time"
              value={value.scheduledStart}
              onChange={(e) => handleStartChange(e.target.value)}
              className="input w-full py-1.5 text-xs"
            />
          </div>
          <span className="mt-4 text-xs text-theme-tertiary">&rarr;</span>
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
        </div>
        <div className="relative">
          <label className="mb-0.5 block text-[10px] text-theme-tertiary">Duration</label>
          <input
            type="number"
            min={0}
            step={5}
            value={value.durationMinutes}
            onChange={(e) => handleDurationChange(e.target.value)}
            className="input w-full py-1.5 pr-12 text-xs"
          />
          <span className="pointer-events-none absolute right-2.5 top-[26px] -translate-y-1/2 text-[10px] text-theme-tertiary">
            <Timer className="inline h-3 w-3" /> min
          </span>
        </div>
      </SectionCard>

      {/* ── Availability (collapsible) ── */}
      <SectionCard
        label="Availability"
        icon={Clock3}
        badge={getAvailabilityBadge(value.availabilityWindows)}
        hasData={getAvailabilityBadge(value.availabilityWindows) !== 'No restrictions'}
        defaultOpen={false}
        compact={compact}
      >
        <AvailabilityEditor
          value={value.availabilityWindows}
          onChange={(next) => set('availabilityWindows', next)}
          defaultDate={defaultDate}
          mapsAvailabilityWindows={mapsAvailabilityWindows}
          flat
        />
      </SectionCard>

      {/* ── Notes (collapsible) ── */}
      <SectionCard
        label="Notes"
        icon={StickyNote}
        badge={
          value.notesMd.trim()
            ? value.notesMd.slice(0, 40).trim() +
              (value.notesMd.length > 40 ? '\u2026' : '')
            : undefined
        }
        hasData={Boolean(value.notesMd.trim())}
        defaultOpen={Boolean(value.notesMd.trim())}
        compact={compact}
      >
        <textarea
          value={value.notesMd}
          onChange={(e) => set('notesMd', e.target.value)}
          className="input w-full resize-none py-1.5 text-xs"
          rows={compact ? 2 : 3}
          placeholder="Notes (markdown)"
        />
      </SectionCard>

      {/* ── Submit ── */}
      {onSubmit && (
        <div className="pt-1">
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
      )}
    </div>
  );
}
