import { DEFAULT_TIMELINE_SNAP_MINUTES } from '@/lib/timeline-snap';
import { getAvailabilityRangesForDate } from '@/lib/availability';
import { toMinutesOfDay } from '@/lib/date-time';
import type { Item } from '@/types/trip';

export const TIMELINE_TYPE_ICON: Record<string, string> = {
  attraction: '\u{1F3DB}\uFE0F',
  restaurant: '\u{1F37D}\uFE0F',
  hotel: '\u{1F3E8}',
  transport: '\u{1F68C}',
  activity: '\u{1F3AF}',
  other: '\u{1F4CD}',
};

export function toMins(value: string): number {
  if (!value) return 0;
  const part = value.includes('T') ? value.split('T')[1] : value;
  const [hours, minutes] = part.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function displayShort(value: string): string {
  const total = toMins(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'p' : 'a';
  const hour12 = hours % 12 || 12;
  return minutes ? `${hour12}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour12}${suffix}`;
}

export function snapM(minutes: number, snapSize = DEFAULT_TIMELINE_SNAP_MINUTES): number {
  return Math.round(minutes / snapSize) * snapSize;
}

export function minuteToY(minutes: number, startHour: number, pxPerMinute: number): number {
  return (minutes - startHour * 60) * pxPerMinute;
}

export function formatTravelDuration(minutes: number): string {
  if (minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function getPreviewAvailabilityRangesForDay(item: Item | null, dayDate: string) {
  if (!item || !item.availabilityWindows) return [];

  return getAvailabilityRangesForDate(item.availabilityWindows, dayDate)
    .map((range) => ({
      startMin: toMinutesOfDay(range.startTime),
      endMin: toMinutesOfDay(range.endTime),
    }))
    .filter(
      (range): range is { startMin: number; endMin: number } =>
        range.startMin !== null &&
        range.endMin !== null &&
        range.endMin > range.startMin,
    );
}
