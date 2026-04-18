export const DEFAULT_TIMELINE_SNAP_MINUTES = 15;
export const TIMELINE_SNAP_MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;

export function normalizeTimelineSnapMinutes(value: number | null | undefined): number {
  return TIMELINE_SNAP_MINUTE_OPTIONS.includes(value as (typeof TIMELINE_SNAP_MINUTE_OPTIONS)[number])
    ? (value as number)
    : DEFAULT_TIMELINE_SNAP_MINUTES;
}
