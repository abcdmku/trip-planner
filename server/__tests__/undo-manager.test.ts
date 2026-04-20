// @vitest-environment node

import { SharedUndoManager } from '../undo-manager';
import type { TripCoreSnapshot } from '../../src/lib/undo-core';

function makeSnapshot(name: string): TripCoreSnapshot {
  return {
    trip: {
      id: 'trip-1',
      name,
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
        colorHex: '#2563EB',
        dayStart: '08:00',
        dayEnd: '22:00',
        timezone: 'UTC',
      },
    ],
    items: [],
    legs: [],
  };
}

describe('SharedUndoManager', () => {
  it('shares undo and redo state per trip', () => {
    const manager = new SharedUndoManager();
    const s0 = makeSnapshot('Trip');
    const s1 = makeSnapshot('Trip v1');
    const s2 = makeSnapshot('Trip v2');

    manager.recordMutation('trip-1', s0, s1);
    manager.recordMutation('trip-1', s1, s2);

    const undoStep = manager.computeUndo('trip-1', s2);
    expect(undoStep?.nextSnapshot.trip.name).toBe('Trip v1');
    expect(undoStep?.nextHistory.future).toHaveLength(1);
    if (!undoStep) return;

    manager.commitStep('trip-1', undoStep.nextHistory);

    const redoStep = manager.computeRedo('trip-1', undoStep.nextSnapshot);
    expect(redoStep?.nextSnapshot.trip.name).toBe('Trip v2');
    expect(redoStep?.nextHistory.past).toHaveLength(2);
  });

  it('resets stale history when the server present snapshot drifts', () => {
    const manager = new SharedUndoManager();
    const s0 = makeSnapshot('Trip');
    const s1 = makeSnapshot('Trip v1');
    const drifted = makeSnapshot('Drifted');

    manager.recordMutation('trip-1', s0, s1);

    const history = manager.getHistory('trip-1', drifted);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(history.present?.trip.name).toBe('Drifted');
  });
});
