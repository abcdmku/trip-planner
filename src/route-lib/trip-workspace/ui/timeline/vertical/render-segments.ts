import { addDays, format, parseISO } from 'date-fns';
import { toMinutesOfDay } from '@/lib/date-time';
import {
  formatInstantForDay,
  getDayBoundsInstant,
  parseScheduledInstant,
  type DayTimeContext,
} from '@/lib/timezone';
import type { Day, Item } from '@/types/trip';

const MINUTES_PER_DAY = 24 * 60;
const LAST_MINUTE_OF_DAY = MINUTES_PER_DAY - 1;
const MINIMUM_SEGMENT_MS = 60_000;

function toClockTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(LAST_MINUTE_OF_DAY, Math.round(minutes)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function nextDate(date: string): string {
  return format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
}

function hasExplicitOffset(value: string): boolean {
  return /(Z|[+-]\d{2}:\d{2})$/i.test(value);
}

function hasExplicitDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function buildSourceContext(item: Item, day: Day): DayTimeContext {
  const explicitDate = hasExplicitDate(item.scheduledStart)
    ? item.scheduledStart.split('T')[0]
    : null;
  return {
    date: explicitDate || day.date,
    timezone: day.timezone,
  };
}

function getAbsoluteRange(item: Item, startDay: Day): { start: Date; end: Date } | null {
  const startContext = buildSourceContext(item, startDay);
  const start = parseScheduledInstant(item.scheduledStart, startContext);
  if (!start) return null;

  const durationMs =
    Number.isFinite(item.durationMinutes) && item.durationMinutes > 0
      ? Math.round(item.durationMinutes) * 60_000
      : 0;

  if (!item.scheduledEnd) {
    return {
      start,
      end: new Date(Math.max(start.getTime() + durationMs, start.getTime() + MINIMUM_SEGMENT_MS)),
    };
  }

  const hasExplicitEndDate = hasExplicitDate(item.scheduledEnd);
  const endHasExplicitOffset = hasExplicitOffset(item.scheduledEnd);
  const sameDayEnd = parseScheduledInstant(item.scheduledEnd, startContext);
  if (!sameDayEnd) {
    return {
      start,
      end: new Date(Math.max(start.getTime() + durationMs, start.getTime() + MINIMUM_SEGMENT_MS)),
    };
  }

  if (endHasExplicitOffset || hasExplicitEndDate) {
    return {
      start,
      end: new Date(Math.max(sameDayEnd.getTime(), start.getTime() + durationMs, start.getTime() + MINIMUM_SEGMENT_MS)),
    };
  }

  if (sameDayEnd.getTime() >= start.getTime()) {
    return {
      start,
      end: new Date(Math.max(sameDayEnd.getTime(), start.getTime() + MINIMUM_SEGMENT_MS)),
    };
  }

  const overnightEnd = parseScheduledInstant(item.scheduledEnd, {
    date: nextDate(startContext.date),
    timezone: startContext.timezone,
  });

  return {
    start,
    end: new Date(
      Math.max(
        overnightEnd?.getTime() ?? start.getTime() + durationMs,
        start.getTime() + durationMs,
        start.getTime() + MINIMUM_SEGMENT_MS,
      ),
    ),
  };
}

export function buildTimelineRenderItemsByDay(days: Day[], items: Item[]): Map<string, Item[]> {
  const byDay = new Map<string, Item[]>();
  for (const day of days) {
    byDay.set(day.dayId, []);
  }

  const dayIndexById = new Map(days.map((day, index) => [day.dayId, index]));

  for (const item of items) {
    if (!item.scheduledStart) continue;

    const startDayIndex = dayIndexById.get(item.dayId);
    if (startDayIndex === undefined) continue;

    const startDay = days[startDayIndex];
    if (!startDay) continue;

    const range = getAbsoluteRange(item, startDay);
    if (!range) continue;

    const segments: Item[] = [];

    for (let index = startDayIndex; index < days.length; index += 1) {
      const targetDay = days[index];
      if (!targetDay) break;

      const targetContext: DayTimeContext = {
        date: targetDay.date,
        timezone: targetDay.timezone,
      };
      const bounds = getDayBoundsInstant(targetContext);
      if (range.end.getTime() <= bounds.start.getTime()) continue;
      if (range.start.getTime() >= bounds.end.getTime()) break;

      const segmentStart = new Date(Math.max(range.start.getTime(), bounds.start.getTime()));
      const segmentEnd = new Date(Math.min(range.end.getTime(), bounds.end.getTime()));
      if (segmentEnd.getTime() <= segmentStart.getTime()) continue;

      const startInfo = formatInstantForDay(segmentStart, targetContext);
      const endInfo = formatInstantForDay(segmentEnd, targetContext);
      const localStart = Math.max(0, Math.min(LAST_MINUTE_OF_DAY, startInfo.minutesOfDay));
      const rawEndMinutes =
        endInfo.localDate === targetDay.date ? endInfo.minutesOfDay : MINUTES_PER_DAY;
      const localEnd = Math.min(LAST_MINUTE_OF_DAY, Math.max(localStart + 1, rawEndMinutes));
      const segmentDuration = Math.max(
        1,
        Math.round((segmentEnd.getTime() - segmentStart.getTime()) / 60_000),
      );

      segments.push({
        ...item,
        dayId: targetDay.dayId,
        scheduledStart: toClockTime(localStart),
        scheduledEnd: toClockTime(localEnd),
        durationMinutes: segmentDuration,
      });
    }

    const spansMultipleDays = segments.length > 1;
    for (const segment of segments) {
      byDay.get(segment.dayId)?.push({
        ...segment,
        // Split segments are display-only for now; timeline drag/resize logic is
        // still single-day and can corrupt overnight ranges.
        timelineLocked: item.timelineLocked || spansMultipleDays,
      });
    }
  }

  for (const day of days) {
    const dayList = byDay.get(day.dayId);
    if (!dayList) continue;
    dayList.sort((a, b) => {
      const timeDelta =
        (toMinutesOfDay(a.scheduledStart) ?? 0) - (toMinutesOfDay(b.scheduledStart) ?? 0);
      if (timeDelta !== 0) return timeDelta;
      return a.sortOrder - b.sortOrder;
    });
  }

  return byDay;
}
