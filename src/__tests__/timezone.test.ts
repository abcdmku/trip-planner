// ---------------------------------------------------------------------------
// Tests for src/lib/timezone.ts
// ---------------------------------------------------------------------------

import { convertTime, isDifferentTimezone, getTimezoneAbbr } from '@/lib/timezone';

// ---------------------------------------------------------------------------
// convertTime
// ---------------------------------------------------------------------------

describe('convertTime', () => {
  it('converts time from one timezone to another', () => {
    // New York (UTC-4 in summer) to London (UTC+1 in summer) = +5 hours.
    const result = convertTime('14:30', '2025-07-01', 'America/New_York', 'Europe/London');
    expect(result).toBe('19:30');
  });

  it('handles same timezone (no change)', () => {
    const result = convertTime('10:00', '2025-07-01', 'America/New_York', 'America/New_York');
    expect(result).toBe('10:00');
  });

  it('handles conversion crossing midnight', () => {
    // Tokyo (UTC+9) to New York (UTC-4 in summer) = -13 hours.
    // 03:00 in Tokyo -> 14:00 previous day in New York.
    const result = convertTime('03:00', '2025-07-01', 'Asia/Tokyo', 'America/New_York');
    expect(result).toBe('14:00');
  });
});

// ---------------------------------------------------------------------------
// isDifferentTimezone
// ---------------------------------------------------------------------------

describe('isDifferentTimezone', () => {
  it('returns true for timezones with different offsets', () => {
    const date = new Date('2025-07-01T12:00:00Z');
    expect(isDifferentTimezone('America/New_York', 'America/Chicago', date)).toBe(true);
  });

  it('returns false for timezone aliases with the same offset', () => {
    const date = new Date('2025-07-01T12:00:00Z');
    expect(isDifferentTimezone('America/New_York', 'US/Eastern', date)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getTimezoneAbbr
// ---------------------------------------------------------------------------

describe('getTimezoneAbbr', () => {
  it('returns an abbreviation string for a timezone', () => {
    const date = new Date('2025-07-01T12:00:00Z');
    const abbr = getTimezoneAbbr('America/New_York', date);
    // In summer, New York is EDT.
    expect(abbr).toBe('EDT');
  });

  it('returns different abbreviation for winter (DST change)', () => {
    const winterDate = new Date('2025-01-15T12:00:00Z');
    const abbr = getTimezoneAbbr('America/New_York', winterDate);
    // In winter, New York is EST.
    expect(abbr).toBe('EST');
  });

  it('keeps common non-US timezones compact for badge rendering', () => {
    const date = new Date('2026-05-13T12:00:00Z');
    expect(getTimezoneAbbr('Europe/London', date)).toBe('BST');
    expect(getTimezoneAbbr('Asia/Tokyo', date)).toBe('JST');
  });
});
