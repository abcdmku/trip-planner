import { format, isValid, parseISO } from 'date-fns';

const DEFAULT_NUMBERED_DAY_LABEL_RE = /^day\s+\d+\b/i;

interface DayLabelSource {
  label: string;
  date: string;
}

export function getWeekdayLabel(date: string): string {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return '';
  return format(parsed, 'EEEE');
}

export function getShortDateLabel(date: string): string {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return date;
  return format(parsed, 'MMM d');
}

export function getAutoDayLabel(date: string, fallbackLabel = ''): string {
  return getWeekdayLabel(date) || fallbackLabel.trim();
}

export function isDefaultNumberedDayLabel(label: string): boolean {
  return DEFAULT_NUMBERED_DAY_LABEL_RE.test(label.trim());
}

export function getDayDisplayLabel(day: DayLabelSource): string {
  const trimmedLabel = day.label.trim();
  if (!trimmedLabel) {
    return getAutoDayLabel(day.date, day.date) || 'Untitled Day';
  }
  if (isDefaultNumberedDayLabel(trimmedLabel)) {
    return getAutoDayLabel(day.date, trimmedLabel);
  }
  return trimmedLabel;
}
