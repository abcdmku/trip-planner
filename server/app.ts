import fs from 'node:fs';
import path from 'node:path';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { addDays, format, isValid, parseISO } from 'date-fns';
import Fastify, { type FastifyReply } from 'fastify';
import type { Prisma, PrismaClient, TripMemberRole, User } from '@prisma/client';
import { z } from 'zod';
import { env } from './config';
import { prisma } from './db';
import {
  buildGoogleOauthUrl,
  clearOauthState,
  clearSessionCookie,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  issueOauthState,
  normalizeEmail,
  readOauthState,
  requireSessionUser,
  resolveSessionUser,
  setSessionCookie,
  upsertSessionUser,
} from './auth';
import {
  serializeAvailabilityWindows,
  serializePhotoUrls,
  toDayDto,
  toInviteDto,
  toItemDto,
  toLegDto,
  toMemberDto,
  toSnapshotResponse,
  toTripDto,
} from './dto';
import { PresenceManager } from './presence';
import { getAutoDayLabel } from '../src/lib/day-labels';
import type { RealtimeClientMessage, SessionUser } from '../src/types/api';
import type { Day, Item, Leg, Trip } from '../src/types/trip';

const transportModeSchema = z.enum(['driving', 'walking', 'bicycling', 'transit', 'flight', 'other']);
const itemTypeSchema = z.enum(['attraction', 'restaurant', 'hotel', 'transport', 'activity', 'other']);
const routeTypeSchema = z.enum(['directions', 'straight']);

const createTripSchema = z.object({
  name: z.string().trim().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  timezone: z.string().min(1),
});

const tripSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseTimezone: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  defaultMode: transportModeSchema,
  startLat: z.number(),
  startLng: z.number(),
  startName: z.string(),
  startAddress: z.string(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByUserId: z.string().nullable().optional(),
});

const daySchema = z.object({
  dayId: z.string().min(1),
  date: z.string().min(1),
  label: z.string().min(1),
  colorHex: z.string().min(1),
  dayStart: z.string().min(1),
  dayEnd: z.string().min(1),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByUserId: z.string().nullable().optional(),
});

const itemSchema = z.object({
  itemId: z.string().min(1),
  dayId: z.string().min(1),
  placeId: z.string(),
  placeName: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  type: itemTypeSchema,
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  durationMinutes: z.number().int(),
  notesMd: z.string(),
  photoUrls: z.array(z.string()),
  availabilityWindows: z.string(),
  isOptional: z.boolean(),
  priority: z.number().int(),
  sortOrder: z.number().int(),
  destLat: z.number(),
  destLng: z.number(),
  destName: z.string(),
  destAddress: z.string(),
  transportMode: transportModeSchema,
  itemRouteType: routeTypeSchema,
  itemRoutePathEncoded: z.string(),
  itemRouteDistanceMeters: z.number().int(),
  itemRouteDurationMinutes: z.number().int(),
  timelineLocked: z.boolean(),
  travelFromItemId: z.string(),
  travelToItemId: z.string(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByUserId: z.string().nullable().optional(),
});

const legSchema = z.object({
  legId: z.string().min(1),
  fromItemId: z.string(),
  toItemId: z.string(),
  mode: transportModeSchema,
  otherModeLabel: z.string().optional(),
  departure: z.string(),
  arrival: z.string(),
  durationMinutes: z.number().int(),
  distanceMeters: z.number().int(),
  routePathEncoded: z.string(),
  routeType: routeTypeSchema,
  version: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByUserId: z.string().nullable().optional(),
});

const reorderSchema = z.object({
  dayId: z.string().min(1),
  orderedItemIds: z.array(z.string().min(1)).min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'editor']).default('editor'),
});

const authStartSchema = z.object({
  nextPath: z.string().default('/'),
});

const cursorSchema = z.object({
  type: z.literal('presence.cursor'),
  tripId: z.string(),
  x: z.number(),
  y: z.number(),
});

const subscribeSchema = z.object({
  type: z.literal('trip.subscribe'),
  tripId: z.string(),
});

const unsubscribeSchema = z.object({
  type: z.literal('trip.unsubscribe'),
  tripId: z.string(),
});

const snapshotSchema = z.object({
  trip: tripSchema,
  days: z.array(daySchema),
  items: z.array(itemSchema),
  legs: z.array(legSchema),
});

type TxClient = Prisma.TransactionClient;

const TRIP_FIELDS = [
  'name',
  'baseTimezone',
  'startDate',
  'endDate',
  'defaultMode',
  'startLat',
  'startLng',
  'startName',
  'startAddress',
] as const;

const DAY_FIELDS = ['date', 'label', 'colorHex', 'dayStart', 'dayEnd'] as const;

const ITEM_FIELDS = [
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
  'destLat',
  'destLng',
  'destName',
  'destAddress',
  'transportMode',
  'itemRouteType',
  'itemRoutePathEncoded',
  'itemRouteDistanceMeters',
  'itemRouteDurationMinutes',
  'timelineLocked',
  'travelFromItemId',
  'travelToItemId',
] as const;

const LEG_FIELDS = [
  'fromItemId',
  'toItemId',
  'mode',
  'otherModeLabel',
  'departure',
  'arrival',
  'durationMinutes',
  'distanceMeters',
  'routePathEncoded',
  'routeType',
] as const;

class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function serializeHistoryValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function roleToDb(role: 'owner' | 'editor'): TripMemberRole {
  return role === 'owner' ? 'OWNER' : 'EDITOR';
}

function roleFromDb(role: TripMemberRole): 'owner' | 'editor' {
  return role === 'OWNER' ? 'owner' : 'editor';
}

function createDaysForTrip(startDate: string, endDate: string): Day[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days: Day[] = [];

  if (!isValid(start) || !isValid(end)) {
    return days;
  }

  for (let cursor = start, index = 0; cursor <= end; cursor = addDays(cursor, 1), index += 1) {
    const date = format(cursor, 'yyyy-MM-dd');
    days.push({
      dayId: crypto.randomUUID(),
      date,
      label: getAutoDayLabel(date, `Day ${index + 1}`),
      colorHex: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'][index % 7],
      dayStart: '08:00',
      dayEnd: '22:00',
    });
  }

  return days;
}

async function writeHistoryEvents(
  tx: TxClient,
  user: SessionUser,
  tripId: string,
  changes: Array<{
    entityType: 'trip' | 'day' | 'item' | 'leg' | 'member' | 'invite';
    entityId: string;
    field: string;
    oldValue?: string;
    newValue?: string;
    itemId?: string;
  }>,
): Promise<void> {
  if (changes.length === 0) return;

  await tx.historyEvent.createMany({
    data: changes.map((change) => ({
      eventId: crypto.randomUUID(),
      tripId,
      timestamp: new Date(),
      userId: user.id,
      userName: user.name,
      entityType: change.entityType,
      entityId: change.entityId,
      field: change.field,
      oldValue: change.oldValue ?? '',
      newValue: change.newValue ?? '',
      itemId: change.itemId ?? '',
    })),
  });
}

async function touchTrip(tx: TxClient, tripId: string, userId: string): Promise<void> {
  await tx.trip.update({
    where: { id: tripId },
    data: {
      version: { increment: 1 },
      updatedByUserId: userId,
    },
  });
}

async function acceptInviteForTrip(
  tx: TxClient,
  user: SessionUser,
  tripId: string,
): Promise<{
  member?: Awaited<ReturnType<typeof tx.tripMember.create>> & { user: User };
  inviteId?: string;
} | null> {
  const email = normalizeEmail(user.email);
  const invite = await tx.tripInvite.findUnique({
    where: {
      tripId_email: {
        tripId,
        email,
      },
    },
  });

  if (!invite) return null;

  const existingMembership = await tx.tripMember.findFirst({
    where: {
      tripId,
      userId: user.id,
    },
  });

  let createdMember:
    | (Awaited<ReturnType<typeof tx.tripMember.create>> & { user: User })
    | undefined;

  if (!existingMembership) {
    createdMember = await tx.tripMember.create({
      data: {
        memberId: crypto.randomUUID(),
        tripId,
        userId: user.id,
        role: invite.role,
      },
      include: {
        user: true,
      },
    });
  }

  await tx.tripInvite.delete({
    where: {
      inviteId: invite.inviteId,
    },
  });

  await writeHistoryEvents(tx, user, tripId, [
    {
      entityType: 'invite',
      entityId: invite.inviteId,
      field: 'accepted',
      oldValue: invite.email,
      newValue: user.email,
    },
    ...(createdMember
      ? [
          {
            entityType: 'member' as const,
            entityId: createdMember.memberId,
            field: 'created',
            oldValue: '',
            newValue: createdMember.user.email,
          },
        ]
      : []),
  ]);

  return {
    member: createdMember,
    inviteId: invite.inviteId,
  };
}

async function acceptAllInvitesForUser(
  tx: TxClient,
  user: SessionUser,
): Promise<void> {
  const invites = await tx.tripInvite.findMany({
    where: {
      email: normalizeEmail(user.email),
    },
  });

  for (const invite of invites) {
    await acceptInviteForTrip(tx, user, invite.tripId);
  }
}

async function requireTripMembership(
  tx: PrismaClient | TxClient,
  tripId: string,
  user: SessionUser,
): Promise<Awaited<ReturnType<typeof tx.tripMember.findFirst>>> {
  const membership = await tx.tripMember.findFirst({
    where: {
      tripId,
      userId: user.id,
    },
  });

  if (!membership) {
    throw new HttpError(403, 'You do not have access to this trip');
  }

  return membership;
}

async function requireTripOwner(
  tx: PrismaClient | TxClient,
  tripId: string,
  user: SessionUser,
): Promise<Awaited<ReturnType<typeof tx.tripMember.findFirst>>> {
  const membership = await requireTripMembership(tx, tripId, user);
  if (membership?.role !== 'OWNER') {
    throw new HttpError(403, 'Only trip owners can manage sharing');
  }
  return membership;
}

async function loadTripSnapshot(tx: PrismaClient | TxClient, tripId: string) {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: {
      days: true,
      items: true,
      legs: true,
      history: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      members: {
        include: {
          user: true,
        },
      },
      invites: {
        include: {
          invitedBy: true,
        },
      },
    },
  });

  if (!trip) {
    throw new HttpError(404, 'Trip not found');
  }

  return toSnapshotResponse({
    trip,
    days: trip.days,
    items: trip.items,
    legs: trip.legs,
    history: trip.history,
    members: trip.members,
    invites: trip.invites,
  });
}

function handleError(reply: FastifyReply, error: unknown): void {
  if (reply.sent) return;
  if (error instanceof HttpError) {
    reply.code(error.statusCode).send({ error: error.message });
    return;
  }

  console.error(error);
  reply.code(500).send({ error: 'Internal server error' });
}

function applyTripUpdates(input: Trip) {
  return {
    name: input.name,
    baseTimezone: input.baseTimezone,
    startDate: input.startDate,
    endDate: input.endDate,
    defaultMode: input.defaultMode,
    startLat: input.startLat,
    startLng: input.startLng,
    startName: input.startName,
    startAddress: input.startAddress,
  };
}

function applyDayUpdates(input: Day) {
  return {
    date: input.date,
    label: input.label,
    colorHex: input.colorHex,
    dayStart: input.dayStart,
    dayEnd: input.dayEnd,
  };
}

function applyItemUpdates(input: Item, tripId: string) {
  return {
    tripId,
    dayId: input.dayId,
    placeId: input.placeId,
    placeName: input.placeName,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    type: input.type,
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    durationMinutes: input.durationMinutes,
    notesMd: input.notesMd,
    photoUrls: serializePhotoUrls(input.photoUrls),
    availabilityWindows: serializeAvailabilityWindows(input.availabilityWindows),
    isOptional: input.isOptional,
    priority: input.priority,
    sortOrder: input.sortOrder,
    destLat: input.destLat,
    destLng: input.destLng,
    destName: input.destName,
    destAddress: input.destAddress,
    transportMode: input.transportMode,
    itemRouteType: input.itemRouteType,
    itemRoutePathEncoded: input.itemRoutePathEncoded,
    itemRouteDistanceMeters: input.itemRouteDistanceMeters,
    itemRouteDurationMinutes: input.itemRouteDurationMinutes,
    timelineLocked: input.timelineLocked,
    travelFromItemId: input.travelFromItemId,
    travelToItemId: input.travelToItemId,
  };
}

function applyLegUpdates(input: Leg, tripId: string) {
  return {
    tripId,
    fromItemId: input.fromItemId,
    toItemId: input.toItemId,
    mode: input.mode,
    otherModeLabel: input.otherModeLabel ?? null,
    departure: input.departure,
    arrival: input.arrival,
    durationMinutes: input.durationMinutes,
    distanceMeters: input.distanceMeters,
    routePathEncoded: input.routePathEncoded,
    routeType: input.routeType,
  };
}

function collectFieldChanges<T extends object>(
  entityType: 'trip' | 'day' | 'item' | 'leg',
  entityId: string,
  before: T,
  after: T,
  fields: readonly (keyof T)[],
  itemId = '',
): Array<{
  entityType: 'trip' | 'day' | 'item' | 'leg';
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  itemId: string;
}> {
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;

  return fields.flatMap((field) => {
    const fieldKey = String(field);
    const oldValue = serializeHistoryValue(beforeRecord[fieldKey]);
    const newValue = serializeHistoryValue(afterRecord[fieldKey]);
    if (oldValue === newValue) return [];
    return [
      {
        entityType,
        entityId,
        field: fieldKey,
        oldValue,
        newValue,
        itemId,
      },
    ];
  });
}

export function buildApp() {
  const app = Fastify({
    logger: true,
  });
  const presence = new PresenceManager();

  app.register(fastifyCookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });
  app.register(fastifyWebsocket);

  const distRoot = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distRoot)) {
    app.register(fastifyStatic, {
      root: distRoot,
      prefix: '/',
      wildcard: false,
    });
  }

  app.get('/api/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  });

  app.get('/api/session', async (request) => {
    const user = await resolveSessionUser(request);
    return { user };
  });

  app.post('/api/auth/google/start', async (request, reply) => {
    const user = await resolveSessionUser(request);
    if (user) {
      return { url: '/' };
    }

    const parsed = authStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid auth start payload' });
      return;
    }

    const nonce = issueOauthState(reply, parsed.data.nextPath);
    return {
      url: buildGoogleOauthUrl(nonce),
    };
  });

  app.get('/api/auth/google/callback', async (request, reply) => {
    try {
      const query = z
        .object({
          code: z.string().optional(),
          state: z.string().optional(),
        })
        .parse(request.query);

      const cookieState = readOauthState(request);
      if (!query.code || !query.state || !cookieState || cookieState.nonce !== query.state) {
        clearOauthState(reply);
        reply.redirect(new URL('/?auth=error', env.APP_URL).toString());
        return;
      }

      const token = await exchangeGoogleCode(query.code);
      const profile = await fetchGoogleUserInfo(token.access_token);
      const user = await upsertSessionUser(profile);

      setSessionCookie(reply, user.id);
      clearOauthState(reply);
      reply.redirect(new URL(cookieState.nextPath || '/', env.APP_URL).toString());
    } catch (error) {
      console.error(error);
      clearOauthState(reply);
      reply.redirect(new URL('/?auth=error', env.APP_URL).toString());
    }
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    reply.code(204).send();
  });

  app.get('/api/trips', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;

    const trips = await prisma.$transaction(async (tx) => {
      await acceptAllInvitesForUser(tx, user);
      return tx.trip.findMany({
        where: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: user.id,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    });

    reply.send(
      trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        baseTimezone: trip.baseTimezone,
        startDate: trip.startDate,
        endDate: trip.endDate,
        updatedAt: trip.updatedAt.toISOString(),
        role: roleFromDb(trip.members[0]?.role ?? 'EDITOR'),
      })),
    );
  });

  app.post('/api/trips', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;

    const parsed = createTripSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid trip payload' });
      return;
    }

    const { name, startDate, endDate, timezone } = parsed.data;
    const tripId = crypto.randomUUID();
    const days = createDaysForTrip(startDate, endDate);

    const created = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          id: tripId,
          name,
          baseTimezone: timezone,
          startDate,
          endDate,
          defaultMode: 'driving',
          startLat: 0,
          startLng: 0,
          startName: '',
          startAddress: '',
          ownerId: user.id,
          updatedByUserId: user.id,
        },
      });

      await tx.tripMember.create({
        data: {
          memberId: crypto.randomUUID(),
          tripId,
          userId: user.id,
          role: 'OWNER',
        },
      });

      if (days.length > 0) {
        await tx.day.createMany({
          data: days.map((day) => ({
            dayId: day.dayId,
            tripId,
            date: day.date,
            label: day.label,
            colorHex: day.colorHex,
            dayStart: day.dayStart,
            dayEnd: day.dayEnd,
            updatedByUserId: user.id,
          })),
        });
      }

      await writeHistoryEvents(tx, user, tripId, [
        {
          entityType: 'trip',
          entityId: tripId,
          field: 'created',
          oldValue: '',
          newValue: name,
        },
      ]);

      return trip;
    });

    reply.code(201).send(toTripDto(created));
  });

  app.get('/api/trips/:tripId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;

    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;

    try {
      const acceptance = await prisma.$transaction(async (tx) => {
        const accepted = await acceptInviteForTrip(tx, user, tripId);
        await requireTripMembership(tx, tripId, user);
        return accepted;
      });

      if (acceptance?.member) {
        presence.broadcastTripEvent(tripId, {
          tripId,
          type: 'member.added',
          actorUserId: user.id,
          timestamp: new Date().toISOString(),
          member: toMemberDto(acceptance.member),
        });
      }
      if (acceptance?.inviteId) {
        presence.broadcastTripEvent(tripId, {
          tripId,
          type: 'invite.removed',
          actorUserId: user.id,
          timestamp: new Date().toISOString(),
          inviteId: acceptance.inviteId,
        });
      }

      reply.send(await loadTripSnapshot(prisma, tripId));
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.patch('/api/trips/:tripId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = tripSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.id !== tripId) {
      reply.code(400).send({ error: 'Invalid trip payload' });
      return;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const existing = await tx.trip.findUnique({ where: { id: tripId } });
        if (!existing) {
          throw new HttpError(404, 'Trip not found');
        }

        const updatedTrip = await tx.trip.update({
          where: { id: tripId },
          data: {
            ...applyTripUpdates(parsed.data),
            version: { increment: 1 },
            updatedByUserId: user.id,
          },
        });

        await writeHistoryEvents(
          tx,
          user,
          tripId,
          collectFieldChanges('trip', tripId, toTripDto(existing), parsed.data as unknown as Trip, TRIP_FIELDS),
        );

        return updatedTrip;
      });

      const dto = toTripDto(updated);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'trip.updated',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        trip: dto,
      });
      reply.send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.get('/api/trips/:tripId/members', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;

    try {
      await requireTripMembership(prisma, tripId, user);
      const [members, invites] = await Promise.all([
        prisma.tripMember.findMany({
          where: { tripId },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.tripInvite.findMany({
          where: { tripId },
          include: { invitedBy: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      reply.send({
        members: members.map(toMemberDto),
        pendingInvites: invites.map(toInviteDto),
      });
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.post('/api/trips/:tripId/invites', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid invite payload' });
      return;
    }

    try {
      const invite = await prisma.$transaction(async (tx) => {
        await requireTripOwner(tx, tripId, user);
        const email = normalizeEmail(parsed.data.email);
        if (email === normalizeEmail(user.email)) {
          throw new HttpError(400, 'You are already a member of this trip');
        }

        const existingUser = await tx.user.findUnique({ where: { email } });
        if (existingUser) {
          const membership = await tx.tripMember.findFirst({
            where: {
              tripId,
              userId: existingUser.id,
            },
          });
          if (membership) {
            throw new HttpError(400, 'That user already has access');
          }
        }

        const created = await tx.tripInvite.upsert({
          where: {
            tripId_email: {
              tripId,
              email,
            },
          },
          update: {
            role: roleToDb(parsed.data.role),
            invitedByUserId: user.id,
          },
          create: {
            inviteId: crypto.randomUUID(),
            tripId,
            email,
            role: roleToDb(parsed.data.role),
            invitedByUserId: user.id,
          },
          include: {
            invitedBy: true,
          },
        });

        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'invite',
            entityId: created.inviteId,
            field: 'created',
            oldValue: '',
            newValue: email,
          },
        ]);

        return created;
      });

      const dto = toInviteDto(invite);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'invite.created',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        invite: dto,
      });
      reply.code(201).send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.delete('/api/trips/:tripId/invites/:inviteId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, inviteId } = z.object({
      tripId: z.string(),
      inviteId: z.string(),
    }).parse(request.params);

    try {
      await prisma.$transaction(async (tx) => {
        await requireTripOwner(tx, tripId, user);
        const existing = await tx.tripInvite.findUnique({
          where: { inviteId },
        });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Invite not found');
        }

        await tx.tripInvite.delete({
          where: { inviteId },
        });

        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'invite',
            entityId: inviteId,
            field: 'deleted',
            oldValue: existing.email,
            newValue: '',
          },
        ]);
      });

      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'invite.removed',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        inviteId,
      });
      reply.code(204).send();
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.delete('/api/trips/:tripId/members/:memberId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, memberId } = z.object({
      tripId: z.string(),
      memberId: z.string(),
    }).parse(request.params);

    try {
      const removed = await prisma.$transaction(async (tx) => {
        await requireTripOwner(tx, tripId, user);
        const existing = await tx.tripMember.findUnique({
          where: { memberId },
          include: { user: true },
        });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Member not found');
        }
        if (existing.role === 'OWNER') {
          throw new HttpError(400, 'Trip owner cannot be removed');
        }

        await tx.tripMember.delete({
          where: { memberId },
        });
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'member',
            entityId: memberId,
            field: 'deleted',
            oldValue: existing.user.email,
            newValue: '',
          },
        ]);
        return existing;
      });

      presence.removeUserFromTrip(tripId, removed.userId);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'member.removed',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        memberId,
      });
      reply.code(204).send();
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.post('/api/trips/:tripId/days', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = daySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid day payload' });
      return;
    }

    try {
      const day = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const created = await tx.day.create({
          data: {
            dayId: parsed.data.dayId,
            tripId,
            date: parsed.data.date,
            label: parsed.data.label,
            colorHex: parsed.data.colorHex,
            dayStart: parsed.data.dayStart,
            dayEnd: parsed.data.dayEnd,
            updatedByUserId: user.id,
          },
        });
        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'day',
            entityId: created.dayId,
            field: 'created',
            oldValue: '',
            newValue: created.label,
          },
        ]);
        return created;
      });

      const dto = toDayDto(day);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'day.created',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        day: dto,
      });
      reply.code(201).send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.patch('/api/trips/:tripId/days/:dayId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, dayId } = z.object({ tripId: z.string(), dayId: z.string() }).parse(request.params);
    const parsed = daySchema.safeParse(request.body);
    if (!parsed.success || parsed.data.dayId !== dayId) {
      reply.code(400).send({ error: 'Invalid day payload' });
      return;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const existing = await tx.day.findUnique({
          where: { dayId },
        });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Day not found');
        }

        const next = await tx.day.update({
          where: { dayId },
          data: {
            ...applyDayUpdates(parsed.data),
            version: { increment: 1 },
            updatedByUserId: user.id,
          },
        });

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(
          tx,
          user,
          tripId,
          collectFieldChanges('day', dayId, toDayDto(existing), parsed.data as unknown as Day, DAY_FIELDS),
        );

        return next;
      });

      const dto = toDayDto(updated);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'day.updated',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        day: dto,
      });
      reply.send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.delete('/api/trips/:tripId/days/:dayId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, dayId } = z.object({ tripId: z.string(), dayId: z.string() }).parse(request.params);

    try {
      const result = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const day = await tx.day.findUnique({
          where: { dayId },
        });
        if (!day || day.tripId !== tripId) {
          throw new HttpError(404, 'Day not found');
        }

        const dayItems = await tx.item.findMany({
          where: { tripId, dayId },
        });
        const itemIds = dayItems.map((item) => item.itemId);

        await tx.leg.deleteMany({
          where: {
            tripId,
            OR: [{ fromItemId: { in: itemIds } }, { toItemId: { in: itemIds } }],
          },
        });
        await tx.item.deleteMany({
          where: { tripId, dayId },
        });
        await tx.day.delete({
          where: { dayId },
        });

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'day',
            entityId: dayId,
            field: 'deleted',
            oldValue: day.label,
            newValue: '',
          },
        ]);

        return {
          dayId,
        };
      });

      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'day.deleted',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        dayId: result.dayId,
      });
      reply.code(204).send();
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.post('/api/trips/:tripId/items', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid item payload' });
      return;
    }

    try {
      const item = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const day = await tx.day.findUnique({ where: { dayId: parsed.data.dayId } });
        if (!day || day.tripId !== tripId) {
          throw new HttpError(400, 'Target day does not belong to this trip');
        }

        const created = await tx.item.create({
          data: {
            itemId: parsed.data.itemId,
            ...applyItemUpdates(parsed.data, tripId),
            updatedByUserId: user.id,
          },
        });

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'item',
            entityId: created.itemId,
            field: 'created',
            oldValue: '',
            newValue: created.placeName,
            itemId: created.itemId,
          },
        ]);
        return created;
      });

      const dto = toItemDto(item);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'item.created',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        item: dto,
      });
      reply.code(201).send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.patch('/api/trips/:tripId/items/:itemId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, itemId } = z.object({ tripId: z.string(), itemId: z.string() }).parse(request.params);
    const parsed = itemSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.itemId !== itemId) {
      reply.code(400).send({ error: 'Invalid item payload' });
      return;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const existing = await tx.item.findUnique({
          where: { itemId },
        });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Item not found');
        }

        const day = await tx.day.findUnique({ where: { dayId: parsed.data.dayId } });
        if (!day || day.tripId !== tripId) {
          throw new HttpError(400, 'Target day does not belong to this trip');
        }

        const next = await tx.item.update({
          where: { itemId },
          data: {
            ...applyItemUpdates(parsed.data, tripId),
            version: { increment: 1 },
            updatedByUserId: user.id,
          },
        });

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(
          tx,
          user,
          tripId,
          collectFieldChanges('item', itemId, toItemDto(existing), parsed.data as unknown as Item, ITEM_FIELDS, itemId),
        );
        return next;
      });

      const dto = toItemDto(updated);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'item.updated',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        item: dto,
      });
      reply.send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.delete('/api/trips/:tripId/items/:itemId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, itemId } = z.object({ tripId: z.string(), itemId: z.string() }).parse(request.params);

    try {
      await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const existing = await tx.item.findUnique({
          where: { itemId },
        });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Item not found');
        }

        await tx.leg.deleteMany({
          where: {
            tripId,
            OR: [{ fromItemId: itemId }, { toItemId: itemId }],
          },
        });
        await tx.item.delete({
          where: { itemId },
        });
        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'item',
            entityId: itemId,
            field: 'deleted',
            oldValue: existing.placeName,
            newValue: '',
            itemId,
          },
        ]);
      });

      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'item.deleted',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        itemId,
      });
      reply.code(204).send();
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.post('/api/trips/:tripId/items/reorder', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = reorderSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid reorder payload' });
      return;
    }

    try {
      const reorderedItems = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const currentItems = await tx.item.findMany({
          where: {
            tripId,
            dayId: parsed.data.dayId,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        });

        const validItemIds = new Set(currentItems.map((item) => item.itemId));
        for (const id of parsed.data.orderedItemIds) {
          if (!validItemIds.has(id)) {
            throw new HttpError(400, 'Reorder payload contains an item outside the target day');
          }
        }

        for (const [index, id] of parsed.data.orderedItemIds.entries()) {
          await tx.item.update({
            where: { itemId: id },
            data: {
              sortOrder: index,
              version: { increment: 1 },
              updatedByUserId: user.id,
            },
          });
        }

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(
          tx,
          user,
          tripId,
          currentItems
            .filter((item) => parsed.data.orderedItemIds.indexOf(item.itemId) !== item.sortOrder)
            .map((item) => ({
              entityType: 'item' as const,
              entityId: item.itemId,
              field: 'sortOrder',
              oldValue: String(item.sortOrder),
              newValue: String(parsed.data.orderedItemIds.indexOf(item.itemId)),
              itemId: item.itemId,
            })),
        );

        return tx.item.findMany({
          where: {
            tripId,
            dayId: parsed.data.dayId,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        });
      });

      const items = reorderedItems.map(toItemDto);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'items.reordered',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        items,
      });
      reply.send(items);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.patch('/api/trips/:tripId/legs/:legId', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const { tripId, legId } = z.object({ tripId: z.string(), legId: z.string() }).parse(request.params);
    const parsed = legSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.legId !== legId) {
      reply.code(400).send({ error: 'Invalid leg payload' });
      return;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        const existing = await tx.leg.findUnique({ where: { legId } });
        if (!existing || existing.tripId !== tripId) {
          throw new HttpError(404, 'Leg not found');
        }

        const next = await tx.leg.update({
          where: { legId },
          data: {
            ...applyLegUpdates(parsed.data, tripId),
            version: { increment: 1 },
            updatedByUserId: user.id,
          },
        });

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(
          tx,
          user,
          tripId,
          collectFieldChanges('leg', legId, toLegDto(existing), parsed.data as unknown as Leg, LEG_FIELDS),
        );
        return next;
      });

      const dto = toLegDto(updated);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'leg.updated',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        leg: dto,
      });
      reply.send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.put('/api/trips/:tripId/legs', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = z.array(legSchema).safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid legs payload' });
      return;
    }

    try {
      const legs = await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        await tx.leg.deleteMany({
          where: { tripId },
        });
        if (parsed.data.length > 0) {
          await tx.leg.createMany({
            data: parsed.data.map((leg) => ({
              legId: leg.legId,
              ...applyLegUpdates(leg, tripId),
              updatedByUserId: user.id,
            })),
          });
        }

        await touchTrip(tx, tripId, user.id);
        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'leg',
            entityId: tripId,
            field: 'replaceAll',
            oldValue: '',
            newValue: String(parsed.data.length),
          },
        ]);

        return tx.leg.findMany({
          where: { tripId },
        });
      });

      const dto = legs.map(toLegDto);
      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'legs.replaced',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
        legs: dto,
      });
      reply.send(dto);
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.put('/api/trips/:tripId/snapshot', async (request, reply) => {
    const user = await requireSessionUser(request, reply);
    if (!user) return;
    const tripId = z.object({ tripId: z.string() }).parse(request.params).tripId;
    const parsed = snapshotSchema.safeParse(request.body);
    if (!parsed.success || parsed.data.trip.id !== tripId) {
      reply.code(400).send({ error: 'Invalid snapshot payload' });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await requireTripMembership(tx, tripId, user);
        await tx.trip.update({
          where: { id: tripId },
          data: {
            ...applyTripUpdates(parsed.data.trip),
            version: { increment: 1 },
            updatedByUserId: user.id,
          },
        });

        await tx.day.deleteMany({ where: { tripId } });
        await tx.item.deleteMany({ where: { tripId } });
        await tx.leg.deleteMany({ where: { tripId } });

        if (parsed.data.days.length > 0) {
          await tx.day.createMany({
            data: parsed.data.days.map((day) => ({
              dayId: day.dayId,
              tripId,
              date: day.date,
              label: day.label,
              colorHex: day.colorHex,
              dayStart: day.dayStart,
              dayEnd: day.dayEnd,
              updatedByUserId: user.id,
            })),
          });
        }

        if (parsed.data.items.length > 0) {
          await tx.item.createMany({
            data: parsed.data.items.map((item) => ({
              itemId: item.itemId,
              ...applyItemUpdates(item, tripId),
              updatedByUserId: user.id,
            })),
          });
        }

        if (parsed.data.legs.length > 0) {
          await tx.leg.createMany({
            data: parsed.data.legs.map((leg) => ({
              legId: leg.legId,
              ...applyLegUpdates(leg, tripId),
              updatedByUserId: user.id,
            })),
          });
        }

        await writeHistoryEvents(tx, user, tripId, [
          {
            entityType: 'trip',
            entityId: tripId,
            field: 'snapshotRestored',
            oldValue: '',
            newValue: new Date().toISOString(),
          },
        ]);
      });

      presence.broadcastTripEvent(tripId, {
        tripId,
        type: 'snapshot.restored',
        actorUserId: user.id,
        timestamp: new Date().toISOString(),
      });
      reply.send(await loadTripSnapshot(prisma, tripId));
    } catch (error) {
      handleError(reply, error);
    }
  });

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const user = await resolveSessionUser(request);
    if (!user) {
      socket.close(4401, 'Authentication required');
      return;
    }

    presence.register(socket, user);

    socket.on('message', async (raw: Buffer) => {
      try {
        const parsed = JSON.parse(raw.toString()) as RealtimeClientMessage;
        const cursorPayload = cursorSchema.safeParse(parsed);
        if (cursorPayload.success) {
          presence.updateCursor(
            socket,
            cursorPayload.data.tripId,
            cursorPayload.data.x,
            cursorPayload.data.y,
          );
          return;
        }

        const subscribePayload = subscribeSchema.safeParse(parsed);
        if (subscribePayload.success) {
          await prisma.$transaction(async (tx) => {
            await acceptInviteForTrip(tx, user, subscribePayload.data.tripId);
            await requireTripMembership(tx, subscribePayload.data.tripId, user);
          });
          presence.subscribe(socket, subscribePayload.data.tripId);
          return;
        }

        const unsubscribePayload = unsubscribeSchema.safeParse(parsed);
        if (unsubscribePayload.success) {
          presence.unsubscribe(socket, unsubscribePayload.data.tripId);
        }
      } catch (error) {
        console.error(error);
      }
    });

    socket.on('close', () => {
      presence.unregister(socket);
    });
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }

    const indexFile = path.join(distRoot, 'index.html');
    if (fs.existsSync(indexFile)) {
      reply.type('text/html').send(fs.readFileSync(indexFile, 'utf8'));
      return;
    }

    reply.code(404).send('Not found');
  });

  return app;
}
