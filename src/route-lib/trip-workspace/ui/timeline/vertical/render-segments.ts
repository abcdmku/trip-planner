import { toMinutesOfDay } from '@/lib/date-time';
import type { Day, Item } from '@/types/trip';

const MINUTES_PER_DAY = 24 * 60;
const LAST_MINUTE_OF_DAY = MINUTES_PER_DAY - 1;

function toClockTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(LAST_MINUTE_OF_DAY, Math.round(minutes)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getAbsoluteRange(item: Item): { startMin: number; endMin: number } | null {
  const startMin = toMinutesOfDay(item.scheduledStart);
  if (startMin === null) return null;

  const explicitEndMin = toMinutesOfDay(item.scheduledEnd);
  const durationMin = Number.isFinite(item.durationMinutes) ? Math.max(0, Math.round(item.durationMinutes)) : 0;

  if (explicitEndMin === null) {
    return { startMin, endMin: startMin + durationMin };
  }

  if (explicitEndMin >= startMin) {
    return { startMin, endMin: explicitEndMin };
  }

  // End clock wrapped past midnight (e.g. 15:20 -> 10:49 next day). Prefer the
  // larger of the implied next-day end or the stored duration if it is longer.
  const impliedOvernightEnd = explicitEndMin + MINUTES_PER_DAY;
  const durationEnd = durationMin > 0 ? startMin + durationMin : impliedOvernightEnd;
  return { startMin, endMin: Math.max(impliedOvernightEnd, durationEnd) };
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

    const range = getAbsoluteRange(item);
    if (!range) continue;

    const absoluteEnd = Math.max(range.endMin, range.startMin + 1);
    const lastOffset = Math.floor((absoluteEnd - 1) / MINUTES_PER_DAY);
    const spansMultipleDays = lastOffset > 0;

    for (let offset = 0; offset <= lastOffset; offset++) {
      const targetDay = days[startDayIndex + offset];
      if (!targetDay) break;

      const segmentStartAbs = Math.max(range.startMin, offset * MINUTES_PER_DAY);
      const segmentEndAbs = Math.min(absoluteEnd, (offset + 1) * MINUTES_PER_DAY);
      if (segmentEndAbs <= segmentStartAbs) continue;

      const localStart = Math.max(
        0,
        Math.min(LAST_MINUTE_OF_DAY, Math.round(segmentStartAbs - offset * MINUTES_PER_DAY)),
      );
      const localEndRaw = Math.max(localStart + 1, Math.round(segmentEndAbs - offset * MINUTES_PER_DAY));
      const localEnd = Math.min(LAST_MINUTE_OF_DAY, localEndRaw);

      const segmentDuration = Math.max(1, Math.round(segmentEndAbs - segmentStartAbs));
      const dayList = byDay.get(targetDay.dayId);
      if (!dayList) continue;

      dayList.push({
        ...item,
        dayId: targetDay.dayId,
        scheduledStart: toClockTime(localStart),
        scheduledEnd: toClockTime(localEnd),
        durationMinutes: segmentDuration,
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
      const timeDelta = (toMinutesOfDay(a.scheduledStart) ?? 0) - (toMinutesOfDay(b.scheduledStart) ?? 0);
      if (timeDelta !== 0) return timeDelta;
      return a.sortOrder - b.sortOrder;
    });
  }

  return byDay;
}

