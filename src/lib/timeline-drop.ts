import { isRangeAllowedForDate } from '@/lib/availability';
import { toMinutesOfDay } from '@/lib/date-time';
import { DEFAULT_TIMELINE_SNAP_MINUTES } from '@/lib/timeline-snap';
import type { Day, Item } from '@/types/trip';

export const TIMELINE_ITEM_DRAG_MIME = 'application/x-trip-item-id';
export const DEFAULT_DRAG_DURATION_MINUTES = 60;
const MAX_MINUTE_OF_DAY = 24 * 60;

export type ExternalDropMode = 'point' | 'append';

export interface DropResolution {
  valid: boolean;
  startMin: number;
  endMin: number;
  durationMinutes: number;
}

interface PointDropParams {
  item: Item;
  day: Day;
  anchorMin: number;
  snapMinutes?: number;
}

interface AppendDropParams {
  item: Item;
  day: Day;
  scheduledItems: Item[];
  snapMinutes?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseTimeToMinutes(value: string, fallback: number): number {
  const parsed = toMinutesOfDay(value);
  return parsed ?? fallback;
}

function toRangeStart(item: Item): number | null {
  const start = toMinutesOfDay(item.scheduledStart);
  if (start === null) return null;
  return start;
}

function toRangeEnd(item: Item): number | null {
  const start = toRangeStart(item);
  if (start === null) return null;

  const explicitEnd = toMinutesOfDay(item.scheduledEnd);
  if (explicitEnd !== null) return explicitEnd;

  return start + getDragDurationMinutes(item);
}

function toTime(minuteOfDay: number): string {
  const bounded = clamp(Math.round(minuteOfDay), 0, MAX_MINUTE_OF_DAY - 1);
  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isCandidateAllowed(item: Item, day: Day, startMin: number, durationMinutes: number): boolean {
  const endMin = startMin + durationMinutes;
  return isRangeAllowedForDate(
    item.availabilityWindows,
    day.date,
    toTime(startMin),
    toTime(endMin),
  );
}

export function getDraggedItemIdFromDataTransfer(dataTransfer: DataTransfer | null): string | null {
  if (!dataTransfer) return null;
  const primary = dataTransfer.getData(TIMELINE_ITEM_DRAG_MIME).trim();
  if (primary) return primary;
  const fallback = dataTransfer.getData('text/plain').trim();
  return fallback || null;
}

export function resolveDraggedItemId(
  dataTransfer: DataTransfer | null,
  fallbackItemId: string | null | undefined,
): string | null {
  return getDraggedItemIdFromDataTransfer(dataTransfer) || fallbackItemId || null;
}

export function getDragDurationMinutes(item: Item): number {
  // Prefer existing scheduled range if both start and end are set
  const start = toMinutesOfDay(item.scheduledStart);
  const end = toMinutesOfDay(item.scheduledEnd);
  if (start !== null && end !== null && end > start) {
    return Math.max(1, end - start);
  }

  const raw = Number(item.durationMinutes);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_DRAG_DURATION_MINUTES;
  }
  return Math.max(1, Math.round(raw));
}

export function snapToTimelineMinutes(
  minutes: number,
  snapMinutes = DEFAULT_TIMELINE_SNAP_MINUTES,
): number {
  return Math.round(minutes / snapMinutes) * snapMinutes;
}

export function snapUpToTimelineMinutes(
  minutes: number,
  snapMinutes = DEFAULT_TIMELINE_SNAP_MINUTES,
): number {
  return Math.ceil(minutes / snapMinutes) * snapMinutes;
}

export function minutesToTime(minutes: number): string {
  return toTime(minutes);
}

export function resolvePointDropNearest({
  item,
  day,
  anchorMin,
  snapMinutes = DEFAULT_TIMELINE_SNAP_MINUTES,
}: PointDropParams): DropResolution {
  const durationMinutes = getDragDurationMinutes(item);
  const maxStart = Math.max(0, MAX_MINUTE_OF_DAY - durationMinutes);
  const snappedAnchor = clamp(snapToTimelineMinutes(anchorMin, snapMinutes), 0, maxStart);

  if (isCandidateAllowed(item, day, snappedAnchor, durationMinutes)) {
    return {
      valid: true,
      startMin: snappedAnchor,
      endMin: snappedAnchor + durationMinutes,
      durationMinutes,
    };
  }

  for (let offset = snapMinutes; offset <= MAX_MINUTE_OF_DAY; offset += snapMinutes) {
    const forward = snappedAnchor + offset;
    const backward = snappedAnchor - offset;

    const forwardValid =
      forward <= maxStart && isCandidateAllowed(item, day, forward, durationMinutes);
    const backwardValid =
      backward >= 0 && isCandidateAllowed(item, day, backward, durationMinutes);

    // Tie breaks prefer future slots.
    if (forwardValid) {
      return {
        valid: true,
        startMin: forward,
        endMin: forward + durationMinutes,
        durationMinutes,
      };
    }

    if (backwardValid) {
      return {
        valid: true,
        startMin: backward,
        endMin: backward + durationMinutes,
        durationMinutes,
      };
    }

    if (forward > maxStart && backward < 0) {
      break;
    }
  }

  return {
    valid: false,
    startMin: snappedAnchor,
    endMin: snappedAnchor + durationMinutes,
    durationMinutes,
  };
}

export function resolveAppendDropAfterLast({
  item,
  day,
  scheduledItems,
  snapMinutes = DEFAULT_TIMELINE_SNAP_MINUTES,
}: AppendDropParams): DropResolution {
  const durationMinutes = getDragDurationMinutes(item);
  const maxStart = Math.max(0, MAX_MINUTE_OF_DAY - durationMinutes);

  const lastScheduledEnd = scheduledItems.reduce((latest, scheduledItem) => {
    const end = toRangeEnd(scheduledItem);
    if (end === null) return latest;
    return Math.max(latest, end);
  }, -1);

  const dayStart = parseTimeToMinutes(day.dayStart, 0);
  const appendAnchor = lastScheduledEnd >= 0 ? lastScheduledEnd : dayStart;
  const startFrom = clamp(snapUpToTimelineMinutes(appendAnchor, snapMinutes), 0, maxStart);

  for (let candidate = startFrom; candidate <= maxStart; candidate += snapMinutes) {
    if (!isCandidateAllowed(item, day, candidate, durationMinutes)) {
      continue;
    }
    return {
      valid: true,
      startMin: candidate,
      endMin: candidate + durationMinutes,
      durationMinutes,
    };
  }

  return {
    valid: false,
    startMin: startFrom,
    endMin: startFrom + durationMinutes,
    durationMinutes,
  };
}
