// @vitest-environment node

import 'dotenv/config';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import WebSocket, { type RawData } from 'ws';
import type { FastifyInstance } from 'fastify';
import { TripMemberRole } from '@prisma/client';
import { buildApp } from '../app';
import { prisma } from '../db';
import type { RealtimeServerMessage } from '../../src/types/api';

type PresenceSelfMessage = Extract<RealtimeServerMessage, { type: 'presence.self' }>;
type PresenceSnapshotMessage = Extract<RealtimeServerMessage, { type: 'presence.snapshot' }>;
type PresenceDiffMessage = Extract<RealtimeServerMessage, { type: 'presence.diff' }>;
type TripEventMessage = Extract<RealtimeServerMessage, { type: 'trip.event' }>;

function isPresenceSelf(message: RealtimeServerMessage): message is PresenceSelfMessage {
  return message.type === 'presence.self';
}

function isPresenceSnapshot(message: RealtimeServerMessage): message is PresenceSnapshotMessage {
  return message.type === 'presence.snapshot';
}

function isPresenceDiff(message: RealtimeServerMessage): message is PresenceDiffMessage {
  return message.type === 'presence.diff';
}

function isTripEvent(message: RealtimeServerMessage): message is TripEventMessage {
  return message.type === 'trip.event';
}

class RealtimeClient {
  private readonly messages: RealtimeServerMessage[] = [];

  private readonly waiters = new Set<{
    predicate: (message: RealtimeServerMessage) => boolean;
    resolve: (message: RealtimeServerMessage) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  constructor(private readonly socket: WebSocket) {
    socket.on('message', (raw: RawData) => {
      const message = JSON.parse(raw.toString()) as RealtimeServerMessage;
      this.messages.push(message);

      for (const waiter of [...this.waiters]) {
        if (!waiter.predicate(message)) continue;
        clearTimeout(waiter.timer);
        this.waiters.delete(waiter);
        waiter.resolve(message);
      }
    });
  }

  send(payload: unknown) {
    this.socket.send(JSON.stringify(payload));
  }

  waitFor<T extends RealtimeServerMessage>(
    predicate: (message: RealtimeServerMessage) => message is T,
    timeoutMs?: number,
  ): Promise<T>;
  waitFor(
    predicate: (message: RealtimeServerMessage) => boolean,
    timeoutMs?: number,
  ): Promise<RealtimeServerMessage>;
  waitFor<T extends RealtimeServerMessage>(
    predicate: ((message: RealtimeServerMessage) => boolean) | ((message: RealtimeServerMessage) => message is T),
    timeoutMs = 3_000,
  ): Promise<T | RealtimeServerMessage> {
    const existing = this.messages.find((message) => predicate(message));
    if (existing) return Promise.resolve(existing as T | RealtimeServerMessage);

    return new Promise<T | RealtimeServerMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new Error('Timed out waiting for realtime message'));
      }, timeoutMs);

      const waiter = {
        predicate,
        resolve,
        reject,
        timer,
      };

      this.waiters.add(waiter);
    });
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;

    await new Promise<void>((resolve) => {
      this.socket.once('close', () => resolve());
      this.socket.close();
    });
  }
}

async function openRealtimeClient(wsUrl: string, cookie: string): Promise<RealtimeClient> {
  const socket = new WebSocket(wsUrl, {
    headers: {
      cookie,
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out opening websocket')), 3_000);

    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  return new RealtimeClient(socket);
}

describe.runIf(process.env.RUN_REALTIME_INTEGRATION === '1')('realtime integration', () => {
  let app: FastifyInstance;
  let baseUrl = '';
  let wsUrl = '';
  const cleanupIds = {
    tripIds: new Set<string>(),
    userIds: new Set<string>(),
  };

  beforeAll(async () => {
    app = buildApp();
    await app.listen({
      host: '127.0.0.1',
      port: 0,
    });

    const address = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    wsUrl = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterAll(async () => {
    await prisma.historyEvent.deleteMany({
      where: {
        tripId: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.leg.deleteMany({
      where: {
        tripId: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.item.deleteMany({
      where: {
        tripId: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.day.deleteMany({
      where: {
        tripId: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.tripMember.deleteMany({
      where: {
        tripId: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.trip.deleteMany({
      where: {
        id: {
          in: [...cleanupIds.tripIds],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [...cleanupIds.userIds],
        },
      },
    });

    await app.close();
  });

  it('streams trip events and presence between two subscribed users', async () => {
    const tripId = randomUUID();
    const dayId = randomUUID();
    const itemId = randomUUID();
    const userAId = randomUUID();
    const userBId = randomUUID();
    cleanupIds.tripIds.add(tripId);
    cleanupIds.userIds.add(userAId);
    cleanupIds.userIds.add(userBId);

    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.com`,
          name: 'User A',
          picture: '',
        },
        {
          id: userBId,
          email: `${userBId}@example.com`,
          name: 'User B',
          picture: '',
        },
      ],
    });

    await prisma.trip.create({
      data: {
        id: tripId,
        name: 'Realtime Trip',
        baseTimezone: 'America/Chicago',
        startDate: '2026-04-18',
        endDate: '2026-04-19',
        defaultMode: 'driving',
        startLat: 0,
        startLng: 0,
        startName: '',
        startAddress: '',
        ownerId: userAId,
        updatedByUserId: userAId,
      },
    });

    await prisma.tripMember.createMany({
      data: [
        {
          memberId: randomUUID(),
          tripId,
          userId: userAId,
          role: TripMemberRole.OWNER,
        },
        {
          memberId: randomUUID(),
          tripId,
          userId: userBId,
          role: TripMemberRole.EDITOR,
        },
      ],
    });

    await prisma.day.create({
      data: {
        dayId,
        tripId,
        date: '2026-04-18',
        label: 'Day 1',
        colorHex: '#2563EB',
        dayStart: '08:00',
        dayEnd: '22:00',
        updatedByUserId: userAId,
      },
    });

    await prisma.item.create({
      data: {
        itemId,
        tripId,
        dayId,
        placeId: 'place-1',
        placeName: 'Museum',
        lat: 1,
        lng: 1,
        address: '1 Main St',
        type: 'activity',
        scheduledStart: '09:00',
        scheduledEnd: '10:00',
        durationMinutes: 60,
        notesMd: '',
        photoUrls: [],
        availabilityWindows: [],
        isOptional: false,
        priority: 0,
        sortOrder: 0,
        destLat: 0,
        destLng: 0,
        destName: '',
        destAddress: '',
        transportMode: 'walking',
        itemRouteType: 'directions',
        itemRoutePathEncoded: '',
        itemRouteDistanceMeters: 0,
        itemRouteDurationMinutes: 0,
        timelineLocked: false,
        travelFromItemId: '',
        travelToItemId: '',
        updatedByUserId: userAId,
      },
    });

    const cookieA = `tp_session=${app.signCookie(userAId)}`;
    const cookieB = `tp_session=${app.signCookie(userBId)}`;

    const clientA = await openRealtimeClient(wsUrl, cookieA);
    const clientB = await openRealtimeClient(wsUrl, cookieB);

    try {
      const selfA = await clientA.waitFor(isPresenceSelf);
      await clientB.waitFor(isPresenceSelf);

      clientA.send({ type: 'trip.subscribe', tripId });
      clientB.send({ type: 'trip.subscribe', tripId });

      await clientA.waitFor(isPresenceSnapshot);
      await clientB.waitFor(isPresenceSnapshot);

      clientA.send({ type: 'presence.cursor', tripId, x: 0.25, y: 0.5 });
      const cursorDiff = await clientB.waitFor(
        (message): message is PresenceDiffMessage => isPresenceDiff(message) && message.upsert.length > 0,
      );
      expect(cursorDiff.upsert[0]?.x).toBe(0.25);
      expect(cursorDiff.upsert[0]?.y).toBe(0.5);

      clientA.send({
        type: 'presence.item-preview',
        tripId,
        itemId,
        dayId,
        scheduledStart: '10:15',
        scheduledEnd: '11:00',
        durationMinutes: 45,
      });
      const previewDiff = await clientB.waitFor(
        (message): message is PresenceDiffMessage =>
          isPresenceDiff(message) && message.previewUpsert.length > 0,
      );
      expect(previewDiff.previewUpsert[0]?.scheduledStart).toBe('10:15');

      const response = await fetch(`${baseUrl}/api/trips/${tripId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
          'X-Realtime-Connection-Id': selfA.connectionId,
        },
        body: JSON.stringify({
          itemId,
          dayId,
          placeId: 'place-1',
          placeName: 'Updated Museum',
          lat: 1,
          lng: 1,
          address: '1 Main St',
          type: 'activity',
          scheduledStart: '09:30',
          scheduledEnd: '10:30',
          durationMinutes: 60,
          notesMd: 'updated',
          photoUrls: [],
          availabilityWindows: '[]',
          isOptional: false,
          priority: 0,
          sortOrder: 0,
          destLat: 0,
          destLng: 0,
          destName: '',
          destAddress: '',
          transportMode: 'walking',
          itemRouteType: 'directions',
          itemRoutePathEncoded: '',
          itemRouteDistanceMeters: 0,
          itemRouteDurationMinutes: 0,
          timelineLocked: false,
          travelFromItemId: '',
          travelToItemId: '',
        }),
      });

      expect(response.ok).toBe(true);

      const tripEvent = await clientB.waitFor(
        (message): message is TripEventMessage =>
          isTripEvent(message) &&
          message.event.type === 'item.updated' &&
          message.event.item?.itemId === itemId,
      );
      expect(tripEvent.event.item?.placeName).toBe('Updated Museum');
      expect(tripEvent.event.actorConnectionId).toBe(selfA.connectionId);

      clientA.send({ type: 'presence.cursor.clear', tripId });
      const cursorClear = await clientB.waitFor(
        (message): message is PresenceDiffMessage =>
          isPresenceDiff(message) &&
          message.participantsUpsert.some((participant) => participant.connectionId === selfA.connectionId && participant.cursor === null),
      );
      expect(
        cursorClear.participantsUpsert.find((participant) => participant.connectionId === selfA.connectionId)?.cursor,
      ).toBeNull();

      clientA.send({ type: 'presence.item-preview.clear', tripId });
      const previewClear = await clientB.waitFor(
        (message): message is PresenceDiffMessage =>
          isPresenceDiff(message) &&
          message.participantsUpsert.some((participant) => participant.connectionId === selfA.connectionId && participant.itemPreview === null),
      );
      expect(
        previewClear.participantsUpsert.find((participant) => participant.connectionId === selfA.connectionId)?.itemPreview,
      ).toBeNull();
    } finally {
      await clientA.close();
      await clientB.close();
    }
  });

  it('shares undo and redo history across subscribed users', async () => {
    const tripId = randomUUID();
    const dayId = randomUUID();
    const itemId = randomUUID();
    const userAId = randomUUID();
    const userBId = randomUUID();
    cleanupIds.tripIds.add(tripId);
    cleanupIds.userIds.add(userAId);
    cleanupIds.userIds.add(userBId);

    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `${userAId}@example.com`,
          name: 'Undo User A',
          picture: '',
        },
        {
          id: userBId,
          email: `${userBId}@example.com`,
          name: 'Undo User B',
          picture: '',
        },
      ],
    });

    await prisma.trip.create({
      data: {
        id: tripId,
        name: 'Undo Trip',
        baseTimezone: 'America/Chicago',
        startDate: '2026-04-18',
        endDate: '2026-04-19',
        defaultMode: 'driving',
        startLat: 0,
        startLng: 0,
        startName: '',
        startAddress: '',
        ownerId: userAId,
        updatedByUserId: userAId,
      },
    });

    await prisma.tripMember.createMany({
      data: [
        {
          memberId: randomUUID(),
          tripId,
          userId: userAId,
          role: TripMemberRole.OWNER,
        },
        {
          memberId: randomUUID(),
          tripId,
          userId: userBId,
          role: TripMemberRole.EDITOR,
        },
      ],
    });

    await prisma.day.create({
      data: {
        dayId,
        tripId,
        date: '2026-04-18',
        label: 'Day 1',
        colorHex: '#2563EB',
        dayStart: '08:00',
        dayEnd: '22:00',
        updatedByUserId: userAId,
      },
    });

    await prisma.item.create({
      data: {
        itemId,
        tripId,
        dayId,
        placeId: 'place-1',
        placeName: 'Museum',
        lat: 1,
        lng: 1,
        address: '1 Main St',
        type: 'activity',
        scheduledStart: '09:00',
        scheduledEnd: '10:00',
        durationMinutes: 60,
        notesMd: '',
        photoUrls: [],
        availabilityWindows: [],
        isOptional: false,
        priority: 0,
        sortOrder: 0,
        destLat: 0,
        destLng: 0,
        destName: '',
        destAddress: '',
        transportMode: 'walking',
        itemRouteType: 'directions',
        itemRoutePathEncoded: '',
        itemRouteDistanceMeters: 0,
        itemRouteDurationMinutes: 0,
        timelineLocked: false,
        travelFromItemId: '',
        travelToItemId: '',
        updatedByUserId: userAId,
      },
    });

    const cookieA = `tp_session=${app.signCookie(userAId)}`;
    const cookieB = `tp_session=${app.signCookie(userBId)}`;
    const clientA = await openRealtimeClient(wsUrl, cookieA);
    const clientB = await openRealtimeClient(wsUrl, cookieB);

    try {
      const selfA = await clientA.waitFor(isPresenceSelf);
      await clientB.waitFor(isPresenceSelf);

      clientA.send({ type: 'trip.subscribe', tripId });
      clientB.send({ type: 'trip.subscribe', tripId });

      await clientA.waitFor(isPresenceSnapshot);
      await clientB.waitFor(isPresenceSnapshot);

      const updateResponse = await fetch(`${baseUrl}/api/trips/${tripId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
          'X-Realtime-Connection-Id': selfA.connectionId,
        },
        body: JSON.stringify({
          itemId,
          dayId,
          placeId: 'place-1',
          placeName: 'Updated Museum',
          lat: 1,
          lng: 1,
          address: '1 Main St',
          type: 'activity',
          scheduledStart: '09:30',
          scheduledEnd: '10:30',
          durationMinutes: 60,
          notesMd: '',
          photoUrls: [],
          availabilityWindows: '[]',
          isOptional: false,
          priority: 0,
          sortOrder: 0,
          destLat: 0,
          destLng: 0,
          destName: '',
          destAddress: '',
          transportMode: 'walking',
          itemRouteType: 'directions',
          itemRoutePathEncoded: '',
          itemRouteDistanceMeters: 0,
          itemRouteDurationMinutes: 0,
          timelineLocked: false,
          travelFromItemId: '',
          travelToItemId: '',
        }),
      });
      expect(updateResponse.ok).toBe(true);
      await clientB.waitFor(
        (message): message is TripEventMessage =>
          isTripEvent(message) &&
          message.event.type === 'item.updated' &&
          message.event.item?.itemId === itemId,
      );

      const undoResponse = await fetch(`${baseUrl}/api/trips/${tripId}/undo`, {
        method: 'POST',
        headers: {
          Cookie: cookieA,
          'X-Realtime-Connection-Id': selfA.connectionId,
        },
      });
      expect(undoResponse.ok).toBe(true);
      const undoSnapshot = (await undoResponse.json()) as { items: Array<{ placeName: string }> };
      expect(undoSnapshot.items[0]?.placeName).toBe('Museum');

      const undoEvent = await clientB.waitFor(
        (message): message is TripEventMessage =>
          isTripEvent(message) && message.event.type === 'snapshot.restored',
      );
      expect(undoEvent.event.actorConnectionId).toBe(selfA.connectionId);

      const redoResponse = await fetch(`${baseUrl}/api/trips/${tripId}/redo`, {
        method: 'POST',
        headers: {
          Cookie: cookieA,
          'X-Realtime-Connection-Id': selfA.connectionId,
        },
      });
      expect(redoResponse.ok).toBe(true);
      const redoSnapshot = (await redoResponse.json()) as { items: Array<{ placeName: string }> };
      expect(redoSnapshot.items[0]?.placeName).toBe('Updated Museum');

      const redoEvent = await clientB.waitFor(
        (message): message is TripEventMessage =>
          isTripEvent(message) && message.event.type === 'snapshot.restored',
      );
      expect(redoEvent.event.actorConnectionId).toBe(selfA.connectionId);
    } finally {
      await clientA.close();
      await clientB.close();
    }
  });
});
