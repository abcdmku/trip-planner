import { Lock, LockOpen, Loader2, Navigation, Route, Timer, Clock3, StickyNote, Bike, Car, Bus, Footprints, Plane, Circle, RotateCw } from 'lucide-react';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { AvailabilityEditor } from '@/components/items/AvailabilityEditor';
import { toMinutesOfDay } from '@/lib/date-time';
import { minutesToTime } from '@/lib/optimizer-utils';
import type { AvailabilityWindow } from '@/lib/availability';

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
  /** Called when the user clicks "Calculate Route" — parent handles the actual API call */
  onCalculateRoute?: () => void;
  /** Whether a route calculation is currently in progress */
  isCalculatingRoute?: boolean;
  /** Whether the item has both origin and destination (enables the calculate button) */
  canCalculateRoute?: boolean;
  /** Show transportation mode & route style (when destination exists or type is transport) */
  showTransportation?: boolean;
  /** Optional place hours from Google Maps to use as availability defaults/source. */
  mapsAvailabilityWindows?: AvailabilityWindow[];
}

const ITEM_TYPES: { value: ItemType; label: string; emoji: string }[] = [
  { value: 'attraction', label: 'Attraction', emoji: '\u{1F3DB}\uFE0F' },
  { value: 'restaurant', label: 'Restaurant', emoji: '\u{1F37D}\uFE0F' },
  { value: 'hotel', label: 'Hotel', emoji: '\u{1F3E8}' },
  { value: 'transport', label: 'Transport', emoji: '\u{1F68C}' },
  { value: 'activity', label: 'Activity', emoji: '\u{1F3AF}' },
  { value: 'other', label: 'Other', emoji: '\u{1F4CD}' },
];

const MODE_OPTIONS: { value: TransportMode; label: string; Icon: typeof Car }[] = [
  { value: 'driving', label: 'Drive', Icon: Car },
  { value: 'walking', label: 'Walk', Icon: Footprints },
  { value: 'bicycling', label: 'Bike', Icon: Bike },
  { value: 'transit', label: 'Transit', Icon: Bus },
  { value: 'flight', label: 'Flight', Icon: Plane },
  { value: 'other', label: 'Other', Icon: Circle },
];

const ROUTE_OPTIONS: { value: RouteType; label: string }[] = [
  { value: 'directions', label: 'Google Route' },
  { value: 'straight', label: 'Polyline' },
];

const GOOGLE_ROUTE_MODES = new Set<TransportMode>([
  'driving',
  'walking',
  'bicycling',
  'transit',
]);

function isGoogleRouteModeCapable(mode: TransportMode): boolean {
  return GOOGLE_ROUTE_MODES.has(mode);
}

function nextModeRoute(mode: TransportMode, current: RouteType): RouteType {
  if (mode === 'flight' || mode === 'other') return 'straight';
  return current;
}

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

export function EventEditorForm({
  value,
  onChange,
  onSubmit,
  submitLabel = 'Save Event',
  isSubmitting = false,
  submitDisabled = false,
  defaultDate,
  compact = false,
  onCalculateRoute,
  isCalculatingRoute = false,
  canCalculateRoute = false,
  showTransportation = false,
  mapsAvailabilityWindows,
}: EventEditorFormProps) {
  const visibleModeOptions =
    value.itemRouteType === 'directions'
      ? MODE_OPTIONS.filter(({ value: mode }) => isGoogleRouteModeCapable(mode))
      : MODE_OPTIONS;

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

  const handleModeChange = (nextMode: TransportMode) => {
    onChange({
      ...value,
      transportMode: nextMode,
      itemRouteType: nextModeRoute(nextMode, value.itemRouteType),
    });
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        <label className="mb-1 block text-xs font-medium text-theme-secondary">Type</label>
        <div className="flex flex-wrap gap-1.5">
          {ITEM_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set('type', option.value)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                value.type === option.value
                  ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                  : 'bg-theme-subtle text-theme-secondary hover:bg-theme hover:text-theme'
              }`}
            >
              {option.emoji} {option.label}
            </button>
          ))}
        </div>
      </div>

      {showTransportation && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-theme-secondary">
              <Navigation className="mr-1 inline h-3 w-3" />
              Transportation
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {visibleModeOptions.map(({ value: mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    value.transportMode === mode
                      ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                      : 'bg-theme-subtle text-theme-secondary hover:bg-theme hover:text-theme'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-theme-secondary">
              <Route className="mr-1 inline h-3 w-3" />
              Route Style
            </label>
            <div className="flex gap-1.5">
              {ROUTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (option.value === 'directions' && !isGoogleRouteModeCapable(value.transportMode)) {
                      onChange({
                        ...value,
                        transportMode: 'driving',
                        itemRouteType: 'directions',
                      });
                      return;
                    }
                    set('itemRouteType', option.value);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    value.itemRouteType === option.value
                      ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                      : 'bg-theme-subtle text-theme-secondary hover:bg-theme hover:text-theme'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-theme-secondary">
            <Clock3 className="mr-1 inline h-3 w-3" />
            Start
          </label>
          <input
            type="time"
            value={value.scheduledStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className="input w-full py-1 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-theme-secondary">End</label>
          <input
            type="time"
            value={value.scheduledEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            min={value.scheduledStart || undefined}
            className="input w-full py-1 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-theme-secondary">
          <Timer className="mr-1 inline h-3 w-3" />
          Duration (minutes)
        </label>
        <div className="flex gap-1.5">
          <input
            type="number"
            min={0}
            step={5}
            value={value.durationMinutes}
            onChange={(e) => handleDurationChange(e.target.value)}
            className="input min-w-0 flex-1 py-1 text-xs"
          />
          {onCalculateRoute && (
            <button
              type="button"
              onClick={onCalculateRoute}
              disabled={!canCalculateRoute || isCalculatingRoute}
              title={canCalculateRoute ? 'Calculate travel time via Google Maps' : 'Add a destination to calculate route'}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors bg-theme-subtle text-theme-secondary hover:bg-theme hover:text-theme disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCalculatingRoute ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCw className="h-3 w-3" />
              )}
              Calculate
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-theme bg-theme-subtle p-2">
        <button
          type="button"
          onClick={() => set('timelineLocked', !value.timelineLocked)}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs"
        >
          <span className="font-medium text-theme-secondary">Timeline lock</span>
          <span className={`inline-flex items-center gap-1 ${value.timelineLocked ? 'text-accent' : 'text-theme-tertiary'}`}>
            {value.timelineLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            {value.timelineLocked ? 'Locked' : 'Editable'}
          </span>
        </button>
      </div>

      <AvailabilityEditor
        value={value.availabilityWindows}
        onChange={(next) => set('availabilityWindows', next)}
        defaultDate={defaultDate}
        mapsAvailabilityWindows={mapsAvailabilityWindows}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-theme-secondary">
          <StickyNote className="mr-1 inline h-3 w-3" />
          Notes
        </label>
        <textarea
          value={value.notesMd}
          onChange={(e) => set('notesMd', e.target.value)}
          className="input w-full resize-none py-1.5 text-xs"
          rows={compact ? 2 : 3}
          placeholder="Notes (markdown)"
        />
      </div>

      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || submitDisabled}
          className="btn-primary flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      )}
    </div>
  );
}
