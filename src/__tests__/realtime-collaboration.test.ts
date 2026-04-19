import {
  getCommittedPreviewConnectionIds,
  isRemoteTripEvent,
  mergeTripItemPreviewDiff,
  removeTripItemPreviewConnections,
  shouldRefetchTripForEvent,
} from '@/lib/realtime';
import { toLiveItemPreview } from '@/components/timeline/vertical/live-preview';
import type { ExternalDragPreview } from '@/components/timeline/vertical/types';
import type { PresenceItemPreview, TripEventEnvelope } from '@/types/api';

function makeEvent(overrides: Partial<TripEventEnvelope> = {}): TripEventEnvelope {
  return {
    tripId: 'trip-1',
    type: 'item.updated',
    actorUserId: 'user-1',
    actorConnectionId: 'conn-1',
    timestamp: '2026-04-18T12:00:00.000Z',
    ...overrides,
  };
}

describe('realtime collaboration helpers', () => {
  it('treats same-user edits from another tab as remote', () => {
    const event = makeEvent({
      actorUserId: 'user-1',
      actorConnectionId: 'conn-2',
    });

    expect(isRemoteTripEvent(event, 'user-1', 'conn-1')).toBe(true);
    expect(shouldRefetchTripForEvent(event, true, true)).toBe(true);
  });

  it('forces a refetch when an event is missing actor connection metadata', () => {
    const event = makeEvent({
      actorUserId: 'user-1',
      actorConnectionId: null,
    });

    expect(isRemoteTripEvent(event, 'user-1', 'conn-1')).toBe(false);
    expect(shouldRefetchTripForEvent(event, true, false)).toBe(true);
  });

  it('converts valid external drag previews into live item previews', () => {
    const preview: ExternalDragPreview = {
      itemId: 'item-1',
      dayId: 'day-2',
      mode: 'point',
      valid: true,
      startMin: 9 * 60 + 15,
      endMin: 10 * 60,
      durationMinutes: 45,
    };

    expect(toLiveItemPreview(preview)).toEqual({
      itemId: 'item-1',
      dayId: 'day-2',
      scheduledStart: '09:15',
      scheduledEnd: '10:00',
      durationMinutes: 45,
      mode: 'move',
    });
  });

  it('drops invalid external previews instead of broadcasting stale drag state', () => {
    const preview: ExternalDragPreview = {
      itemId: 'item-1',
      dayId: 'day-2',
      mode: 'append',
      valid: false,
      startMin: 0,
      endMin: 60,
      durationMinutes: 60,
    };

    expect(toLiveItemPreview(preview)).toBeNull();
  });

  it('keeps a cleared live preview until the matching committed item event finalizes it', () => {
    const preview: PresenceItemPreview = {
      connectionId: 'conn-2',
      tripId: 'trip-1',
      userId: 'user-2',
      name: 'Remote User',
      picture: '',
      color: '#2563EB',
      itemId: 'item-1',
      dayId: 'day-2',
      scheduledStart: '10:15',
      scheduledEnd: '11:00',
      durationMinutes: 45,
      mode: 'move',
      updatedAt: '2026-04-18T12:00:00.000Z',
    };

    const afterDiff = mergeTripItemPreviewDiff([preview], []);
    expect(afterDiff).toEqual([preview]);

    const committedIds = getCommittedPreviewConnectionIds(
      makeEvent({
        actorConnectionId: 'conn-2',
      }),
    );
    expect(removeTripItemPreviewConnections(afterDiff, committedIds)).toEqual([]);
  });
});
