import { useCallback, useMemo } from 'react';
import { buildTimelineRenderItemsByDay } from '@route-lib/trip-workspace/ui/timeline/vertical/render-segments';
import { deriveTimelineConnectors } from '@/lib/connectors';
import { resolveAppendDropAfterLast } from '@/lib/timeline-drop';
import type { Day, Item } from '@/types/trip';

interface UseTripWorkspaceDerivedDataParams {
  days: Day[];
  committedItems: Item[];
  renderItems: Item[];
  selectedDayId: string | null;
  mapEventFilter: 'all' | 'committed';
  draggingItemId: string | null;
  timelineSnapMinutes: number;
}

export function useTripWorkspaceDerivedData({
  days,
  committedItems,
  renderItems,
  selectedDayId,
  mapEventFilter,
  draggingItemId,
  timelineSnapMinutes,
}: UseTripWorkspaceDerivedDataParams) {
  const orderedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );
  const renderItemsByDay = useMemo(
    () => buildTimelineRenderItemsByDay(orderedDays, renderItems),
    [orderedDays, renderItems],
  );

  const itemAppearanceDayIdsById = useMemo(() => {
    const next = new Map<string, string[]>();

    for (const day of orderedDays) {
      for (const renderItem of renderItemsByDay.get(day.dayId) ?? []) {
        const current = next.get(renderItem.itemId) ?? [];
        if (!current.includes(day.dayId)) {
          current.push(day.dayId);
          next.set(renderItem.itemId, current);
        }
      }
    }

    return next;
  }, [orderedDays, renderItemsByDay]);

  const selectedDayDisplayItemsById = useMemo(() => {
    if (!selectedDayId) return new Map<string, Item>();
    return new Map((renderItemsByDay.get(selectedDayId) ?? []).map((item) => [item.itemId, item]));
  }, [renderItemsByDay, selectedDayId]);

  const itemDayColorsById = useMemo(() => {
    const dayColorById = new Map(orderedDays.map((day) => [day.dayId, day.colorHex]));
    const next = new Map<string, string[]>();

    for (const item of renderItems) {
      const dayIds = itemAppearanceDayIdsById.get(item.itemId) ?? [];
      const colors = dayIds
        .map((dayId) => dayColorById.get(dayId))
        .filter((color): color is string => Boolean(color));
      next.set(item.itemId, colors);
    }

    return next;
  }, [itemAppearanceDayIdsById, orderedDays, renderItems]);

  const filteredItems = useMemo(() => {
    if (!selectedDayId) return renderItems;
    return renderItems.filter((item) =>
      (itemAppearanceDayIdsById.get(item.itemId) ?? [item.dayId]).includes(selectedDayId),
    );
  }, [itemAppearanceDayIdsById, renderItems, selectedDayId]);

  const selectedDayIds = useMemo(
    () => (selectedDayId ? [selectedDayId] : undefined),
    [selectedDayId],
  );

  const mapItems = useMemo(
    () =>
      mapEventFilter === 'committed'
        ? filteredItems.filter((item) => Boolean(item.scheduledStart))
        : filteredItems,
    [filteredItems, mapEventFilter],
  );

  const mapItemIds = useMemo(() => new Set(mapItems.map((item) => item.itemId)), [mapItems]);

  const mapConnectors = useMemo(() => deriveTimelineConnectors(mapItems), [mapItems]);

  const getScheduledItemsForDay = useCallback(
    (dayId: string, excludeItemId?: string) =>
      committedItems
        .filter(
          (item) =>
            item.dayId === dayId &&
            item.itemId !== excludeItemId &&
            Boolean(item.scheduledStart),
        )
        .sort((a, b) => {
          const aStart = a.scheduledStart || '';
          const bStart = b.scheduledStart || '';
          return aStart.localeCompare(bStart);
        }),
    [committedItems],
  );

  const dayDropValidityById = useMemo(() => {
    if (!draggingItemId) return undefined;
    const draggedItem = committedItems.find((item) => item.itemId === draggingItemId);
    if (!draggedItem) return undefined;

    const validity: Record<string, boolean> = {};
    for (const day of days) {
      const dayScheduledItems = getScheduledItemsForDay(day.dayId, draggingItemId);
      const resolution = resolveAppendDropAfterLast({
        item: draggedItem,
        day,
        scheduledItems: dayScheduledItems,
        snapMinutes: timelineSnapMinutes,
      });
      validity[day.dayId] = resolution.valid;
    }

    return validity;
  }, [committedItems, days, draggingItemId, getScheduledItemsForDay, timelineSnapMinutes]);

  return {
    dayDropValidityById,
    filteredItems,
    getScheduledItemsForDay,
    itemAppearanceDayIdsById,
    itemDayColorsById,
    mapConnectors,
    mapItemIds,
    mapItems,
    orderedDays,
    selectedDayDisplayItemsById,
    selectedDayIds,
  };
}
