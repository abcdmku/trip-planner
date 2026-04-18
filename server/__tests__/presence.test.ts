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

    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'presence.snapshot',
        tripId: 'trip-1',
        cursors: [],
        itemPreviews: [],
      }),
    );
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

  it('broadcasts cursor upserts and removals to other subscribers', () => {
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

    viewer.send.mockClear();
    manager.clearCursor(sender as never, 'trip-1');

    expect(viewer.send).toHaveBeenCalledTimes(1);
    expect(viewer.send.mock.calls[0]?.[0]).toContain('"removeConnectionIds"');
  });
});
