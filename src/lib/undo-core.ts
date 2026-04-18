import type { Day, Item, Leg, Trip } from '@/types/trip';

type TripCoreSource = {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
};

export type TripCoreSnapshot = {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
};

export type UndoHistory = {
  version: 1;
  presentSignature: string | null;
  present: TripCoreSnapshot | null;
  past: TripCoreSnapshot[];
  future: TripCoreSnapshot[];
};

export const UNDO_HISTORY_VERSION = 1 as const;
export const DEFAULT_MAX_HISTORY = 100;

export function extractTripCoreSnapshot(data: TripCoreSource): TripCoreSnapshot {
  return deepClone({
    trip: data.trip,
    days: data.days,
    items: data.items,
    legs: data.legs,
  });
}

export function createEmptyUndoHistory(
  presentSignature: string | null,
  present: TripCoreSnapshot | null,
): UndoHistory {
  return {
    version: UNDO_HISTORY_VERSION,
    presentSignature,
    present,
    past: [],
    future: [],
  };
}

export function ensureUndoHistoryCompatible(
  history: UndoHistory | null | undefined,
  present: TripCoreSnapshot,
): UndoHistory {
  const presentSig = tripCoreSignature(present);
  const current = history ?? createEmptyUndoHistory(null, null);

  if (current.presentSignature !== presentSig) {
    return createEmptyUndoHistory(presentSig, deepClone(present));
  }

  if (!current.present) {
    return {
      ...current,
      present: deepClone(present),
    };
  }

  return current;
}

export function recordUndoableChange(params: {
  history: UndoHistory | null | undefined;
  before: TripCoreSnapshot;
  after: TripCoreSnapshot;
  maxHistory?: number;
}): UndoHistory {
  const { before, after } = params;
  const maxHistory = params.maxHistory ?? DEFAULT_MAX_HISTORY;
  const beforeSig = tripCoreSignature(before);
  const afterSig = tripCoreSignature(after);

  let history = params.history ?? createEmptyUndoHistory(null, null);

  if (history.presentSignature !== beforeSig) {
    history = createEmptyUndoHistory(beforeSig, deepClone(before));
  }

  if (beforeSig === afterSig) {
    return {
      ...history,
      presentSignature: afterSig,
      present: deepClone(after),
    };
  }

  const past = [...history.past, deepClone(before)];
  const trimmedPast = past.length > maxHistory ? past.slice(past.length - maxHistory) : past;

  return {
    version: UNDO_HISTORY_VERSION,
    presentSignature: afterSig,
    present: deepClone(after),
    past: trimmedPast,
    future: [],
  };
}

export function computeUndoStep(params: {
  history: UndoHistory;
  present: TripCoreSnapshot;
  maxHistory?: number;
}): { nextHistory: UndoHistory; nextSnapshot: TripCoreSnapshot } | null {
  const { history, present } = params;
  const maxHistory = params.maxHistory ?? DEFAULT_MAX_HISTORY;

  if (history.past.length === 0) return null;

  const nextSnapshot = deepClone(history.past[history.past.length - 1]);
  const nextPast = history.past.slice(0, -1);
  const future = [...history.future, deepClone(present)];
  const trimmedFuture = future.length > maxHistory ? future.slice(future.length - maxHistory) : future;

  return {
    nextSnapshot,
    nextHistory: {
      version: UNDO_HISTORY_VERSION,
      presentSignature: tripCoreSignature(nextSnapshot),
      present: deepClone(nextSnapshot),
      past: nextPast,
      future: trimmedFuture,
    },
  };
}

export function computeRedoStep(params: {
  history: UndoHistory;
  present: TripCoreSnapshot;
  maxHistory?: number;
}): { nextHistory: UndoHistory; nextSnapshot: TripCoreSnapshot } | null {
  const { history, present } = params;
  const maxHistory = params.maxHistory ?? DEFAULT_MAX_HISTORY;

  if (history.future.length === 0) return null;

  const nextSnapshot = deepClone(history.future[history.future.length - 1]);
  const nextFuture = history.future.slice(0, -1);
  const past = [...history.past, deepClone(present)];
  const trimmedPast = past.length > maxHistory ? past.slice(past.length - maxHistory) : past;

  return {
    nextSnapshot,
    nextHistory: {
      version: UNDO_HISTORY_VERSION,
      presentSignature: tripCoreSignature(nextSnapshot),
      present: deepClone(nextSnapshot),
      past: trimmedPast,
      future: nextFuture,
    },
  };
}

export function tripCoreSignature(snapshot: TripCoreSnapshot): string {
  const normalized = {
    trip: normalizeTripForSignature(snapshot.trip),
    days: [...snapshot.days]
      .map(normalizeDayForSignature)
      .sort((a, b) => a.dayId.localeCompare(b.dayId)),
    items: [...snapshot.items]
      .map(normalizeItemForSignature)
      .sort((a, b) => a.itemId.localeCompare(b.itemId)),
    legs: [...snapshot.legs]
      .map(normalizeLegForSignature)
      .sort((a, b) => a.legId.localeCompare(b.legId)),
  };

  return fnv1aHash(stableStringify(normalized));
}

function normalizeTripForSignature(trip: Trip) {
  const { version, createdAt, updatedAt, updatedByUserId, ...stableTrip } = trip;
  void version;
  void createdAt;
  void updatedAt;
  void updatedByUserId;
  return stableTrip;
}

function normalizeDayForSignature(day: Day) {
  const { version, createdAt, updatedAt, updatedByUserId, ...stableDay } = day;
  void version;
  void createdAt;
  void updatedAt;
  void updatedByUserId;
  return stableDay;
}

function normalizeItemForSignature(item: Item) {
  const { version, createdAt, updatedAt, updatedByUserId, ...stableItem } = item;
  void version;
  void createdAt;
  void updatedAt;
  void updatedByUserId;
  return stableItem;
}

function normalizeLegForSignature(leg: Leg) {
  const { version, createdAt, updatedAt, updatedByUserId, ...stableLeg } = leg;
  void version;
  void createdAt;
  void updatedAt;
  void updatedByUserId;
  return stableLeg;
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const record = val as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(record).sort()) {
        sorted[key] = record[key];
      }
      return sorted;
    }
    return val;
  });
}

function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
