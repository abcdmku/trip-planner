import { toTime } from './time';
import type { ExternalDragPreview, LiveItemPreview } from './types';

export function toLiveItemPreview(preview: ExternalDragPreview | null): LiveItemPreview | null {
  if (!preview?.valid) return null;

  return {
    itemId: preview.itemId,
    dayId: preview.dayId,
    scheduledStart: toTime(preview.startMin),
    scheduledEnd: toTime(preview.endMin),
    durationMinutes: preview.durationMinutes,
    mode: preview.mode === 'append' || preview.mode === 'point' ? 'move' : preview.mode,
  };
}
