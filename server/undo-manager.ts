import {
  computeRedoStep,
  computeUndoStep,
  ensureUndoHistoryCompatible,
  recordUndoableChange,
  type TripCoreSnapshot,
  type UndoHistory,
} from '../src/lib/undo-core';

export class SharedUndoManager {
  private readonly historyByTripId = new Map<string, UndoHistory>();

  getHistory(tripId: string, present: TripCoreSnapshot): UndoHistory {
    const next = ensureUndoHistoryCompatible(this.historyByTripId.get(tripId), present);
    this.historyByTripId.set(tripId, next);
    return next;
  }

  recordMutation(tripId: string, before: TripCoreSnapshot, after: TripCoreSnapshot): UndoHistory {
    const next = recordUndoableChange({
      history: this.historyByTripId.get(tripId),
      before,
      after,
    });
    this.historyByTripId.set(tripId, next);
    return next;
  }

  computeUndo(tripId: string, present: TripCoreSnapshot) {
    return computeUndoStep({
      history: this.getHistory(tripId, present),
      present,
    });
  }

  computeRedo(tripId: string, present: TripCoreSnapshot) {
    return computeRedoStep({
      history: this.getHistory(tripId, present),
      present,
    });
  }

  commitStep(tripId: string, history: UndoHistory): void {
    this.historyByTripId.set(tripId, history);
  }

  resetTrip(tripId: string, present: TripCoreSnapshot): UndoHistory {
    const next = ensureUndoHistoryCompatible(null, present);
    this.historyByTripId.set(tripId, next);
    return next;
  }
}
