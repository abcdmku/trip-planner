// ---------------------------------------------------------------------------
// Tests for src/lib/availability.ts
// ---------------------------------------------------------------------------

import {
  parseAvailabilityWindows,
  isAvailable,
  nextAvailableSlot,
  hasAvailabilityConstraints,
} from '@/lib/availability';
import type { AvailabilityWindow } from '@/lib/availability';

// ---------------------------------------------------------------------------
// parseAvailabilityWindows
// ---------------------------------------------------------------------------

describe('parseAvailabilityWindows', () => {
  it('parses valid JSON into AvailabilityWindow[]', () => {
    const json = JSON.stringify([
      { openTime: '09:00', closeTime: '17:00' },
      { dayOfWeek: 1, openTime: '10:00', closeTime: '14:00' },
    ]);

    const result = parseAvailabilityWindows(json);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ openTime: '09:00', closeTime: '17:00' });
    expect(result[1]).toEqual({
      dayOfWeek: 1,
      openTime: '10:00',
      closeTime: '14:00',
    });
  });

  it('returns empty array for empty / null / malformed input', () => {
    expect(parseAvailabilityWindows('')).toEqual([]);
    expect(parseAvailabilityWindows('  ')).toEqual([]);
    expect(parseAvailabilityWindows('[]')).toEqual([]);
    expect(parseAvailabilityWindows('not json')).toEqual([]);
    expect(parseAvailabilityWindows(null as unknown as string)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------

describe('isAvailable', () => {
  const windows: AvailabilityWindow[] = [
    { openTime: '09:00', closeTime: '17:00' },
  ];

  it('returns true when time fits within a window', () => {
    // 2025-08-01 is a Friday (dayOfWeek=5) -- window has no dayOfWeek constraint.
    expect(isAvailable(windows, '2025-08-01', '10:00', '12:00')).toBe(true);
  });

  it('returns false when time is outside the window', () => {
    expect(isAvailable(windows, '2025-08-01', '07:00', '08:30')).toBe(false);
    expect(isAvailable(windows, '2025-08-01', '16:00', '18:00')).toBe(false);
  });

  it('returns true when there are no windows (always available)', () => {
    expect(isAvailable([], '2025-08-01', '03:00', '04:00')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// nextAvailableSlot
// ---------------------------------------------------------------------------

describe('nextAvailableSlot', () => {
  const windows: AvailabilityWindow[] = [
    { openTime: '09:00', closeTime: '12:00' },
    { openTime: '14:00', closeTime: '18:00' },
  ];

  it('finds the next slot when minStartTime is before the first window', () => {
    const slot = nextAvailableSlot(windows, '2025-08-01', '07:00', 60);
    expect(slot).toBe('09:00');
  });

  it('finds a slot in a later window when the first is too small', () => {
    // Ask for 4 hours starting at 10:00 -- first window only has 2 hours left.
    const slot = nextAvailableSlot(windows, '2025-08-01', '10:00', 240);
    expect(slot).toBe('14:00');
  });

  it('returns null when no window can fit the duration', () => {
    const slot = nextAvailableSlot(windows, '2025-08-01', '17:00', 120);
    expect(slot).toBeNull();
  });

  it('returns minStartTime directly when there are no windows', () => {
    const slot = nextAvailableSlot([], '2025-08-01', '05:30', 60);
    expect(slot).toBe('05:30');
  });
});

// ---------------------------------------------------------------------------
// hasAvailabilityConstraints
// ---------------------------------------------------------------------------

describe('hasAvailabilityConstraints', () => {
  it('returns true when item has valid availability windows', () => {
    const item = {
      availabilityWindows: JSON.stringify([
        { openTime: '09:00', closeTime: '17:00' },
      ]),
    };
    expect(hasAvailabilityConstraints(item)).toBe(true);
  });

  it('returns false when item has no availability windows', () => {
    expect(hasAvailabilityConstraints({ availabilityWindows: '' })).toBe(false);
    expect(hasAvailabilityConstraints({ availabilityWindows: '[]' })).toBe(
      false,
    );
  });
});
