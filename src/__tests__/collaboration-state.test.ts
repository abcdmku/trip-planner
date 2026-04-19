import { buildRemoteObjectPresenceById } from '@/lib/collaboration/state';
import { collaborationStore } from '@/stores/collaboration-store';
import type { CollaborationParticipant } from '@/types/collaboration';

function makeParticipant(
  connectionId: string,
  overrides: Partial<CollaborationParticipant> = {},
): CollaborationParticipant {
  return {
    connectionId,
    tripId: 'trip-1',
    userId: connectionId,
    name: connectionId,
    picture: '',
    color: '#2563EB',
    status: 'active',
    joinedAt: '2026-04-18T12:00:00.000Z',
    lastSeenAt: '2026-04-18T12:00:00.000Z',
    cursor: null,
    itemPreview: null,
    selection: null,
    viewport: null,
    manipulation: null,
    ...overrides,
  };
}

describe('collaboration state helpers', () => {
  afterEach(() => {
    collaborationStore.clearAll();
  });

  it('merges snapshots and diffs by connection id', () => {
    collaborationStore.applySnapshot('trip-1', [makeParticipant('conn-a')]);
    collaborationStore.applyDiff('trip-1', [makeParticipant('conn-b')], []);

    expect(collaborationStore.getRoomSnapshot('trip-1').participants).toHaveLength(2);

    collaborationStore.applyDiff('trip-1', [], ['conn-a']);
    expect(collaborationStore.getRoomSnapshot('trip-1').participants.map((entry) => entry.connectionId)).toEqual([
      'conn-b',
    ]);
  });

  it('derives manipulation badges ahead of plain selections', () => {
    const map = buildRemoteObjectPresenceById([
      makeParticipant('conn-a', {
        itemPreview: {
          connectionId: 'conn-a',
          tripId: 'trip-1',
          userId: 'conn-a',
          name: 'Alice',
          picture: '',
          color: '#2563EB',
          itemId: 'item-1',
          dayId: 'day-1',
          scheduledStart: '09:00',
          scheduledEnd: '10:00',
          durationMinutes: 60,
          mode: 'move',
          updatedAt: '2026-04-18T12:00:00.000Z',
        },
        manipulation: {
          connectionId: 'conn-a',
          tripId: 'trip-1',
          userId: 'conn-a',
          objectId: 'item-1',
          kind: 'move',
          label: 'Moving',
          updatedAt: '2026-04-18T12:00:00.000Z',
        },
      }),
      makeParticipant('conn-b', {
        selection: {
          connectionId: 'conn-b',
          tripId: 'trip-1',
          userId: 'conn-b',
          objectIds: ['item-2'],
          primaryObjectId: 'item-2',
          updatedAt: '2026-04-18T12:00:00.000Z',
        },
      }),
    ], null);

    expect(map.get('item-1')?.[0]?.kind).toBe('move');
    expect(map.get('item-2')?.[0]?.kind).toBe('selection');
  });

  it('clones nested viewport map camera state', () => {
    const source = makeParticipant('conn-a', {
      viewport: {
        connectionId: 'conn-a',
        tripId: 'trip-1',
        userId: 'conn-a',
        viewMode: 'map',
        focusedDayId: 'day-1',
        scrollLeft: 0,
        scrollTop: 24,
        zoom: 1,
        activeTab: 'map',
        workspaceLayout: 'tabbed',
        leftPanelWidth: 720,
        selectedDayId: 'day-1',
        itineraryScrollTop: 120,
        mapEventFilter: 'committed',
        mapCamera: {
          center: {
            lat: 41.881832,
            lng: -87.623177,
          },
          zoom: 11,
        },
        mapOpenLocation: {
          placeId: 'place-1',
          position: {
            lat: 41.884,
            lng: -87.632,
          },
          name: 'Cloud Gate',
        },
        updatedAt: '2026-04-18T12:00:00.000Z',
      },
    });
    collaborationStore.applySnapshot('trip-1', [source]);

    const stored = collaborationStore.getRoomSnapshot('trip-1').participants[0]?.viewport;
    expect(stored?.mapCamera).toEqual({
      center: {
        lat: 41.881832,
        lng: -87.623177,
      },
      zoom: 11,
    });
    expect(stored?.workspaceLayout).toBe('tabbed');
    expect(stored?.leftPanelWidth).toBe(720);
    expect(stored?.mapCamera).not.toBe(source.viewport?.mapCamera);
    expect(stored?.mapOpenLocation).toEqual({
      placeId: 'place-1',
      position: {
        lat: 41.884,
        lng: -87.632,
      },
      name: 'Cloud Gate',
    });
    expect(stored?.mapOpenLocation).not.toBe(source.viewport?.mapOpenLocation);
  });
});
