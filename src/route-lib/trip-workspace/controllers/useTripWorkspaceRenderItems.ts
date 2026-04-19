import { useMemo } from 'react';
import type { PresenceItemPreview } from '@/types/api';
import type { Item } from '@/types/trip';

export function useTripWorkspaceRenderItems(
  committedItems: Item[],
  tripItemPreviews: PresenceItemPreview[],
  localConnectionId: string | null,
) {
  const previewByItemId = useMemo(() => {
    const next = new Map<string, PresenceItemPreview>();
    for (const preview of tripItemPreviews) {
      if (preview.connectionId === localConnectionId) continue;
      const existing = next.get(preview.itemId);
      if (!existing || existing.updatedAt < preview.updatedAt) {
        next.set(preview.itemId, preview);
      }
    }
    return next;
  }, [localConnectionId, tripItemPreviews]);

  return useMemo(
    () =>
      committedItems.map((item) => {
        const preview = previewByItemId.get(item.itemId);
        if (!preview) return item;
        return {
          ...item,
          dayId: preview.dayId,
          scheduledStart: preview.scheduledStart,
          scheduledEnd: preview.scheduledEnd,
          durationMinutes: preview.durationMinutes,
        };
      }),
    [committedItems, previewByItemId],
  );
}
