import type { AvailabilityWindow } from '@/lib/availability';
import { extractTime, toMinutesOfDay } from '@/lib/date-time';
import { getTimezoneAbbr } from '@/lib/timezone';
import type { Day, Item } from '@/types/trip';

type DayTimeZoneContext = Pick<Day, 'date' | 'timezone'>;

const MONDAY_FIRST_DAY_LABELS = [
  { label: 'Monday', dayOfWeek: 1 },
  { label: 'Tuesday', dayOfWeek: 2 },
  { label: 'Wednesday', dayOfWeek: 3 },
  { label: 'Thursday', dayOfWeek: 4 },
  { label: 'Friday', dayOfWeek: 5 },
  { label: 'Saturday', dayOfWeek: 6 },
  { label: 'Sunday', dayOfWeek: 0 },
] as const;

function toReferenceDate(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function formatMinutes(totalMinutes: number, style: 'compact' | 'verbose'): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hour12 = hours % 12 || 12;

  if (style === 'compact') {
    const suffix = hours >= 12 ? 'p' : 'a';
    return minutes ? `${hour12}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour12}${suffix}`;
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatAvailabilityWindow(window: AvailabilityWindow): string {
  if (window.openTime === '00:00' && window.closeTime === '23:59') {
    return 'Open 24 hours';
  }

  const start = formatClockLabel(window.openTime, 'verbose');
  const end = formatClockLabel(window.closeTime, 'verbose');
  return `${start} - ${end}`;
}

export function getDayTimezoneLabel(day?: DayTimeZoneContext | null): string | null {
  if (!day) return null;
  return getTimezoneAbbr(day.timezone, toReferenceDate(day.date));
}

export function formatClockLabel(value: string, style: 'compact' | 'verbose' = 'compact'): string {
  const minutes = toMinutesOfDay(value);
  if (minutes === null) return extractTime(value) || value;
  return formatMinutes(minutes, style);
}

export function buildTimeRangeLabel({
  start,
  end,
  timezoneLabel,
  style = 'compact',
}: {
  start?: string | null;
  end?: string | null;
  timezoneLabel?: string | null;
  style?: 'compact' | 'verbose';
}): string | null {
  const parts = buildTimeRangeParts({ start, end, timezoneLabel, style });
  if (!parts) return null;
  return parts.timezoneLabel ? `${parts.rangeLabel} ${parts.timezoneLabel}` : parts.rangeLabel;
}

export function buildTimeRangeParts({
  start,
  end,
  timezoneLabel,
  style = 'compact',
}: {
  start?: string | null;
  end?: string | null;
  timezoneLabel?: string | null;
  style?: 'compact' | 'verbose';
}): { rangeLabel: string; timezoneLabel: string | null } | null {
  if (!start) return null;

  const startLabel = formatClockLabel(start, style);
  const endLabel = end ? formatClockLabel(end, style) : null;
  return {
    rangeLabel: endLabel ? `${startLabel} - ${endLabel}` : startLabel,
    timezoneLabel: timezoneLabel ?? null,
  };
}

export function getDisplayItemForDay(item: Item, displayItemsById?: Map<string, Item>): Item {
  return displayItemsById?.get(item.itemId) ?? item;
}

export function buildHoursOfOperationSummary(day?: DayTimeZoneContext | null): string {
  const timezoneLabel = getDayTimezoneLabel(day);
  return timezoneLabel ? `Hours of operation - ${timezoneLabel}` : 'Hours of operation';
}

export function buildHoursOfOperationLines({
  day: _day,
  weekdayText,
  mapsAvailabilityWindows,
}: {
  day?: DayTimeZoneContext | null;
  weekdayText?: string[] | null;
  mapsAvailabilityWindows?: AvailabilityWindow[] | null;
}): string[] {
  if (mapsAvailabilityWindows && mapsAvailabilityWindows.length > 0) {
    return MONDAY_FIRST_DAY_LABELS.map(({ label, dayOfWeek }) => {
      const windows = mapsAvailabilityWindows.filter(
        (window) => window.dayOfWeek === undefined || window.dayOfWeek === dayOfWeek,
      );

      if (windows.length === 0) {
        return `${label}: Closed`;
      }

      return `${label}: ${windows
        .map((window) => formatAvailabilityWindow(window))
        .join(', ')}`;
    });
  }

  if (!weekdayText || weekdayText.length === 0) return [];
  return weekdayText;
}
