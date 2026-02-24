// ---------------------------------------------------------------------------
// undo-store - local (client-side) undo/redo history for Trip edits.
//
// We intentionally keep this history local (localStorage) and separate from the
// Google Sheets "History" audit trail.
// ---------------------------------------------------------------------------

import type { Day, Item, Leg, Trip, TripData } from '@/types/trip';

export type TripCoreSnapshot = {
  trip: Trip;
  days: Day[];
  items: Item[];
  legs: Leg[];
};

export type UndoHistory = {
  version: 1;
  /** Signature of the current "present" snapshot. Used to detect drift. */
  presentSignature: string | null;
  /** Most recent known "present" snapshot, stored locally for recovery. */
  present: TripCoreSnapshot | null;
  past: TripCoreSnapshot[];
  future: TripCoreSnapshot[];
};

const STORAGE_VERSION = 1 as const;
const STORAGE_PREFIX = 'trip-planner:undo:v1:';
export const DEFAULT_MAX_HISTORY = 100;

const memoryHistoryByKey = new Map<string, UndoHistory>();

export function extractTripCoreSnapshot(data: TripData): TripCoreSnapshot {
  return deepClone({
    trip: data.trip,
    days: data.days,
    items: data.items,
    legs: data.legs,
  });
}

export function getUndoStorageKey(spreadsheetId: string): string {
  return `${STORAGE_PREFIX}${spreadsheetId}`;
}

export function readUndoHistory(spreadsheetId: string): UndoHistory {
  const empty = createEmptyHistory(null, null);
  const key = getUndoStorageKey(spreadsheetId);
  const cached = memoryHistoryByKey.get(key);

  if (!canUseLocalStorage()) return cached ?? empty;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return cached ?? empty;
    const parsed = JSON.parse(raw) as unknown;
    const hydrated = hydrateHistory(parsed);
    const resolved = hydrated ?? cached ?? empty;
    memoryHistoryByKey.set(key, resolved);
    return resolved;
  } catch {
    return cached ?? empty;
  }
}

export function writeUndoHistory(spreadsheetId: string, history: UndoHistory): void {
  const key = getUndoStorageKey(spreadsheetId);
  memoryHistoryByKey.set(key, history);
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // Ignore quota / serialization failures. Undo will still work in-memory for this session.
  }
}

export function clearUndoHistory(spreadsheetId: string): void {
  const key = getUndoStorageKey(spreadsheetId);
  memoryHistoryByKey.delete(key);
  if (!canUseLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Ensure stored undo history matches the currently loaded "present" snapshot.
 *
 * If the stored present signature differs (e.g., edits from another tab/user,
 * or stale localStorage), we reset the stacks to avoid undoing into an
 * unrelated state.
 */
export function ensureUndoHistoryCompatible(
  spreadsheetId: string,
  present: TripCoreSnapshot,
): UndoHistory {
  const presentSig = tripCoreSignature(present);
  const current = readUndoHistory(spreadsheetId);

  if (current.presentSignature !== presentSig) {
    const reset = createEmptyHistory(presentSig, deepClone(present));
    writeUndoHistory(spreadsheetId, reset);
    return reset;
  }

  if (!current.present) {
    const updated: UndoHistory = { ...current, present: deepClone(present) };
    writeUndoHistory(spreadsheetId, updated);
    return updated;
  }

  return current;
}

/**
 * Record a successful undoable change, pushing `before` onto `past`,
 * clearing `future`, and setting the present signature to `after`.
 *
 * If the stored present signature does not match `before`, the existing stacks
 * are discarded to avoid corrupt history.
 */
export function recordUndoableChange(params: {
  spreadsheetId: string;
  before: TripCoreSnapshot;
  after: TripCoreSnapshot;
  maxHistory?: number;
}): UndoHistory {
  const { spreadsheetId, before, after } = params;
  const maxHistory = params.maxHistory ?? DEFAULT_MAX_HISTORY;

  const beforeSig = tripCoreSignature(before);
  const afterSig = tripCoreSignature(after);

  let history = readUndoHistory(spreadsheetId);

  if (history.presentSignature !== beforeSig) {
    history = createEmptyHistory(beforeSig, deepClone(before));
  }

  if (beforeSig === afterSig) {
    const updated: UndoHistory = {
      ...history,
      presentSignature: afterSig,
      present: deepClone(after),
    };
    writeUndoHistory(spreadsheetId, updated);
    return updated;
  }

  const past = [...history.past, deepClone(before)];
  const trimmedPast =
    past.length > maxHistory ? past.slice(past.length - maxHistory) : past;

  const updated: UndoHistory = {
    version: STORAGE_VERSION,
    presentSignature: afterSig,
    present: deepClone(after),
    past: trimmedPast,
    future: [],
  };

  writeUndoHistory(spreadsheetId, updated);
  return updated;
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
  const trimmedFuture =
    future.length > maxHistory ? future.slice(future.length - maxHistory) : future;

  const nextHistory: UndoHistory = {
    version: STORAGE_VERSION,
    presentSignature: tripCoreSignature(nextSnapshot),
    present: deepClone(nextSnapshot),
    past: nextPast,
    future: trimmedFuture,
  };

  return { nextHistory, nextSnapshot };
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
  const trimmedPast =
    past.length > maxHistory ? past.slice(past.length - maxHistory) : past;

  const nextHistory: UndoHistory = {
    version: STORAGE_VERSION,
    presentSignature: tripCoreSignature(nextSnapshot),
    present: deepClone(nextSnapshot),
    past: trimmedPast,
    future: nextFuture,
  };

  return { nextHistory, nextSnapshot };
}

export function tripCoreSignature(snapshot: TripCoreSnapshot): string {
  const normalized = {
    trip: snapshot.trip,
    days: [...snapshot.days].sort((a, b) => a.dayId.localeCompare(b.dayId)),
    items: [...snapshot.items].sort((a, b) => a.itemId.localeCompare(b.itemId)),
    legs: [...snapshot.legs].sort((a, b) => a.legId.localeCompare(b.legId)),
  };

  return fnv1aHash(stableStringify(normalized));
}

export function getMostRecentLocalSnapshot(history: UndoHistory): TripCoreSnapshot | null {
  if (history.present) return deepClone(history.present);
  if (history.future.length > 0) return deepClone(history.future[history.future.length - 1]);
  if (history.past.length > 0) return deepClone(history.past[history.past.length - 1]);
  return null;
}

function createEmptyHistory(
  presentSignature: string | null,
  present: TripCoreSnapshot | null,
): UndoHistory {
  return {
    version: STORAGE_VERSION,
    presentSignature,
    present,
    past: [],
    future: [],
  };
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function hydrateHistory(value: unknown): UndoHistory | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<UndoHistory>;
  if (v.version !== STORAGE_VERSION) return null;

  const presentSignature =
    typeof v.presentSignature === 'string' || v.presentSignature === null
      ? v.presentSignature
      : null;

  if (!Array.isArray(v.past) || !Array.isArray(v.future)) return null;

  const present =
    v.present && typeof v.present === 'object'
      ? (v.present as TripCoreSnapshot)
      : null;

  // Basic structural validation only - snapshots are treated as opaque JSON.
  return {
    version: STORAGE_VERSION,
    presentSignature,
    present,
    past: v.past as TripCoreSnapshot[],
    future: v.future as TripCoreSnapshot[],
  };
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
