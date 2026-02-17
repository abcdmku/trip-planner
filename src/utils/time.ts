import dayjs from 'dayjs';

export const TIME_FORMAT = 'HH:mm';

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  return hours * 60 + minutes;
}

export function fromMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function clampToBounds(time: string, min: string, max: string): string {
  const value = toMinutes(time);
  const minValue = toMinutes(min);
  const maxValue = toMinutes(max);
  const clamped = Math.max(minValue, Math.min(maxValue, value));
  return fromMinutes(clamped);
}

export function durationBetween(start: string, end: string): number {
  const startValue = toMinutes(start);
  const endValue = toMinutes(end);
  return Math.max(0, endValue - startValue);
}

export function shiftTimeRange(start: string, end: string, deltaMinutes: number): {
  startTime: string;
  endTime: string;
} {
  return {
    startTime: fromMinutes(toMinutes(start) + deltaMinutes),
    endTime: fromMinutes(toMinutes(end) + deltaMinutes)
  };
}

export function combineDateAndTime(date: string, time: string): string {
  return dayjs(`${date}T${time}`).toISOString();
}

export function nowIso(): string {
  return dayjs().toISOString();
}

export function todayIsoDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function plusDays(isoDate: string, days: number): string {
  return dayjs(isoDate).add(days, 'day').format('YYYY-MM-DD');
}

export function formatHumanTime(isoDateTime: string): string {
  return dayjs(isoDateTime).format('MMM D, HH:mm');
}
