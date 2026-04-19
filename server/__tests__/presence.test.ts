// @vitest-environment node

import { PresenceManager } from '../presence';
import type { SessionUser, TripEventEnvelope } from '../../src/types/api';

function makeUser(id: string): SessionUser {
  return {
    id,
    email: `${id}@example.com`,
    name: id,
    picture: '',
  };
}

function makeSocket() {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  };
}

describe('PresenceManager', () => {
  it('sends a presence snapshot even when the socket has no instance OPEN property', () => {
    const manager = new PresenceManager();
    const socket = makeSocket();

    manager.register(socket as never, makeUser('user-a'));
    manager.subscribe(socket as never, 'trip-1');

    expect(socket.send).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(socket.send.mock.calls[0]?.[0] as string) as {
      type: string;
      tripId: string;
      participants: Array<{ tripId: string; userId: string; status: string }>;
      cursors: unknown[];
      itemPreviews: unknown[];
    };

    expect(payload.type).toBe('presence.snapshot');
    expect(payload.tripId).toBe('trip-1');
    expect(payload.participants[0]).toMatchObject({
      tripId: 'trip-1',
      userId: 'user-a',
      status: 'active',
    });
    expect(payload.cursors).toEqual([]);
    expect(payload.itemPreviews).toEqual([]);
  });

  it('broadcasts trip events to every subscribed socket', () => {
    const manager = new PresenceManager();
    const socketA = makeSocket();
    const socketB = makeSocket();
    const event: TripEventEnvelope = {
      tripId: 'trip-1',
      type: 'item.updated',
      actorUserId: 'user-a',
      actorConnectionId: 'conn-a',
      timestamp: '2026-04-18T18:00:00.000Z',
      itemId: 'item-1',
    };

    manager.register(socketA as never, makeUser('user-a'));
    manager.register(socketB as never, makeUser('user-b'));
    manager.subscribe(socketA as never, 'trip-1');
    manager.subscribe(socketB as never, 'trip-1');

    socketA.send.mockClear();
    socketB.send.mockClear();

    manager.broadcastTripEvent('trip-1', event);

    expect(socketA.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'trip.event',
        event,
      }),
    );
    expect(socketB.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'trip.event',
        event,
      }),
    );
  });

  it('broadcasts cursor upserts and clears through participant diffs', () => {
    const manager = new PresenceManager();
    const sender = makeSocket();
    const viewer = makeSocket();

    manager.register(sender as never, makeUser('user-a'));
    manager.register(viewer as never, makeUser('user-b'));
    manager.subscribe(sender as never, 'trip-1');
    manager.subscribe(viewer as never, 'trip-1');

    sender.send.mockClear();
    viewer.send.mockClear();

    manager.updateCursor(sender as never, 'trip-1', 0.25, 0.5);

    expect(viewer.send).toHaveBeenCalledTimes(1);
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"type":"presence.diff"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"x":0.25');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"participantsUpsert"');

    viewer.send.mockClear();
    manager.clearCursor(sender as never, 'trip-1');

    expect(viewer.send).toHaveBeenCalledTimes(1);
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"cursor":null');
  });

  it('updates selection and viewport state on the participant record', () => {
    const manager = new PresenceManager();
    const sender = makeSocket();
    const viewer = makeSocket();

    manager.register(sender as never, makeUser('user-a'));
    manager.register(viewer as never, makeUser('user-b'));
    manager.subscribe(sender as never, 'trip-1');
    manager.subscribe(viewer as never, 'trip-1');

    viewer.send.mockClear();

    manager.updateSelection(sender as never, 'trip-1', {
      objectIds: ['item-1'],
      primaryObjectId: 'item-1',
    });
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"primaryObjectId":"item-1"');

    viewer.send.mockClear();
    manager.updateViewport(sender as never, 'trip-1', {
      viewMode: 'multi',
      focusedDayId: 'day-1',
      scrollLeft: 120,
      scrollTop: 40,
      zoom: 1.2,
      activeTab: 'timeline',
      workspaceLayout: 'tabbed',
      selectedDayId: 'day-1',
      itineraryScrollTop: 320,
      mapEventFilter: 'committed',
      mapCamera: {
        center: {
          lat: 41.881832,
          lng: -87.623177,
        },
        zoom: 11,
      },
    });
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"viewMode":"multi"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"zoom":1.2');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"activeTab":"timeline"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"workspaceLayout":"tabbed"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"selectedDayId":"day-1"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"itineraryScrollTop":320');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"mapEventFilter":"committed"');
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"lat":41.881832');
  });
});
