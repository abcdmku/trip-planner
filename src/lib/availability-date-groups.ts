import {
  serializeAvailabilityDateSlots,
  type AvailabilityDateSlot,
} from '@/lib/availability';

export interface AvailabilityDateGroup {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  /** Sorted, unique ISO dates (YYYY-MM-DD). */
  dates: string[];
}

function uniqSorted(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(Boolean))).sort();
}

export function groupAvailabilityDateSlots(
  expandedSlots: AvailabilityDateSlot[],
): AvailabilityDateGroup[] {
  const byRange = new Map<string, { startTime: string; endTime: string; dates: Set<string> }>();

  for (const slot of expandedSlots) {
    if (!slot?.date || !slot.startTime || !slot.endTime) continue;
    const key = `${slot.startTime}__${slot.endTime}`;
    const existing = byRange.get(key) ?? {
      startTime: slot.startTime,
      endTime: slot.endTime,
      dates: new Set<string>(),
    };
    existing.dates.add(slot.date);
    byRange.set(key, existing);
  }

  return Array.from(byRange.values())
    .map((group) => ({
      startTime: group.startTime,
      endTime: group.endTime,
      dates: Array.from(group.dates).sort(),
    }))
    .sort((a, b) => {
      const aKey = `${a.startTime}__${a.endTime}`;
      const bKey = `${b.startTime}__${b.endTime}`;
      return aKey.localeCompare(bKey);
    });
}

export function serializeAvailabilityDateGroups(groups: AvailabilityDateGroup[]): string {
  const slots: AvailabilityDateSlot[] = [];

  for (const group of groups) {
    if (!group?.startTime || !group?.endTime) continue;
    const dates = uniqSorted(group.dates);
    if (dates.length === 0) continue;
    const [first, ...rest] = dates;
    slots.push({
      date: first,
      startTime: group.startTime,
      endTime: group.endTime,
      ...(rest.length > 0 ? { repeatDates: rest } : {}),
    });
  }

  return serializeAvailabilityDateSlots(slots);
}

