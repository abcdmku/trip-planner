// ---------------------------------------------------------------------------
// history-service – Field-level change detection and HistoryEvent creation.
//
// Used by mutation hooks (useItems, etc.) to automatically produce an audit
// trail every time a domain object is modified.
// ---------------------------------------------------------------------------

import type { HistoryEvent, Item } from '@/types/trip';

// ---------------------------------------------------------------------------
// Fields that are compared when detecting changes on an Item.
//
// We intentionally list every mutable field so new fields added to the Item
// type will cause a compile error here if they are not handled.
// ---------------------------------------------------------------------------

const TRACKED_FIELDS: readonly (keyof Item)[] = [
  'dayId',
  'placeId',
  'placeName',
  'lat',
  'lng',
  'address',
  'type',
  'scheduledStart',
  'scheduledEnd',
  'durationMinutes',
  'notesMd',
  'photoUrls',
  'availabilityWindows',
  'isOptional',
  'priority',
  'sortOrder',
] as const;

// ---------------------------------------------------------------------------
// Serialisation helper
// ---------------------------------------------------------------------------

/**
 * Convert an arbitrary Item field value to a stable string representation
 * suitable for storage in a HistoryEvent.
 */
function serialise(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a single `HistoryEvent` with a generated UUID and current timestamp.
 */
export function createHistoryEvent(
  field: string,
  oldValue: string,
  newValue: string,
  itemId: string,
  userId: string,
  userName: string,
): HistoryEvent {
  return {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    field,
    oldValue,
    newValue,
    itemId,
  };
}

/**
 * Compare two Item snapshots field-by-field and return a `HistoryEvent[]`
 * describing every changed field.
 *
 * Fields whose serialised representations are identical are skipped.  The
 * `itemId` is taken from the **new** item.
 */
export function detectChanges(
  oldItem: Item,
  newItem: Item,
  userId: string,
  userName: string,
): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldSer = serialise(oldItem[field]);
    const newSer = serialise(newItem[field]);

    if (oldSer !== newSer) {
      events.push(
        createHistoryEvent(field, oldSer, newSer, newItem.itemId, userId, userName),
      );
    }
  }

  return events;
}
