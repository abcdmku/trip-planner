import {
  DEFAULT_TIMELINE_SNAP_MINUTES,
  normalizeTimelineSnapMinutes,
} from '@/lib/timeline-snap';

export const TIMELINE_SNAP_STORAGE_KEY = 'trip-planner:timeline-snap-minutes';

export function loadTimelineSnapMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE_SNAP_MINUTES;

  try {
    const stored = window.localStorage.getItem(TIMELINE_SNAP_STORAGE_KEY);
    return normalizeTimelineSnapMinutes(stored === null ? undefined : Number(stored));
  } catch {
    return DEFAULT_TIMELINE_SNAP_MINUTES;
  }
}

export function persistTimelineSnapMinutes(value: number) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(TIMELINE_SNAP_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures and keep the in-memory state authoritative.
  }
}
