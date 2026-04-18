import { describe, expect, test } from 'vitest';
import {
  computeRedoStep,
  computeUndoStep,
  createEmptyUndoHistory,
  ensureUndoHistoryCompatible,
  recordUndoableChange,
  tripCoreSignature,
  type TripCoreSnapshot,
} from '@/lib/undo-core';

function makeBaseSnapshot(overrides?: Partial<TripCoreSnapshot>): TripCoreSnapshot {
  const base: TripCoreSnapshot = {
    trip: {
      id: 'trip-1',
      name: 'Trip',
      baseTimezone: 'UTC',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      defaultMode: 'driving',
      startLat: 0,
      startLng: 0,
      startName: '',
      startAddress: '',
    },
    days: [
      {
        dayId: 'day-1',
        date: '2026-01-01',
        label: 'Day 1',
        colorHex: '#3B82F6',
        dayStart: '08:00',
        dayEnd: '22:00',
      },
    ],
    items: [
      {
        itemId: 'item-1',
        dayId: 'day-1',
        placeId: '',
        placeName: 'Place',
        lat: 0,
        lng: 0,
        address: '',
        type: 'other',
        scheduledStart: '',
        scheduledEnd: '',
        durationMinutes: 0,
        notesMd: '',
        photoUrls: [],
        availabilityWindows: '[]',
        isOptional: false,
        priority: 0,
        sortOrder: 0,
        destLat: 0,
        destLng: 0,
        destName: '',
        destAddress: '',
        transportMode: 'driving',
        itemRouteType: 'directions',
        itemRoutePathEncoded: '',
        itemRouteDistanceMeters: 0,
        itemRouteDurationMinutes: 0,
        timelineLocked: false,
        travelFromItemId: '',
        travelToItemId: '',
      },
    ],
    legs: [],
  };

  return {
    ...base,
    ...overrides,
  };
}

describe('undo-core', () => {
  test('recordUndoableChange pushes "before" and clears future', () => {
    const before = makeBaseSnapshot();
    const after = makeBaseSnapshot({ trip: { ...before.trip, name: 'Trip v2' } });

    const history = recordUndoableChange({
      history: createEmptyUndoHistory(tripCoreSignature(before), before),
      before,
      after,
    });

    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
    expect(history.presentSignature).toBe(tripCoreSignature(after));
    expect(history.past[0].trip.name).toBe('Trip');
  });

  test('ensureUndoHistoryCompatible resets when present signature differs', () => {
    const presentA = makeBaseSnapshot();
    const presentB = makeBaseSnapshot({ trip: { ...presentA.trip, name: 'Different' } });

    const ensured = ensureUndoHistoryCompatible(
      {
        version: 1,
        presentSignature: tripCoreSignature(presentA),
        present: presentA,
        past: [presentA],
        future: [presentA],
      },
      presentB,
    );

    expect(ensured.past).toHaveLength(0);
    expect(ensured.future).toHaveLength(0);
    expect(ensured.presentSignature).toBe(tripCoreSignature(presentB));
  });

  test('computeUndoStep/computeRedoStep roundtrip', () => {
    const s0 = makeBaseSnapshot();
    const s1 = makeBaseSnapshot({ trip: { ...s0.trip, name: 'S1' } });
    const s2 = makeBaseSnapshot({ trip: { ...s0.trip, name: 'S2' } });

    const historyS1 = recordUndoableChange({
      history: createEmptyUndoHistory(tripCoreSignature(s0), s0),
      before: s0,
      after: s1,
    });
    const historyS2 = recordUndoableChange({
      history: historyS1,
      before: s1,
      after: s2,
    });

    const undoStep = computeUndoStep({ history: historyS2, present: s2 });
    expect(undoStep).not.toBeNull();
    if (!undoStep) return;

    expect(undoStep.nextSnapshot.trip.name).toBe('S1');
    expect(undoStep.nextHistory.past).toHaveLength(1);
    expect(undoStep.nextHistory.future).toHaveLength(1);

    const redoStep = computeRedoStep({
      history: undoStep.nextHistory,
      present: undoStep.nextSnapshot,
    });
    expect(redoStep).not.toBeNull();
    if (!redoStep) return;

    expect(redoStep.nextSnapshot.trip.name).toBe('S2');
    expect(redoStep.nextHistory.past).toHaveLength(2);
    expect(redoStep.nextHistory.future).toHaveLength(0);
  });
});
