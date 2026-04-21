import type {
  Day as DayRecord,
  HistoryEvent as HistoryEventRecord,
  Item as ItemRecord,
  Leg as LegRecord,
  Prisma,
  Trip as TripRecord,
  TripInvite as TripInviteRecord,
  TripMember as TripMemberRecord,
  User,
} from './prisma-client';
import type {
  TripInvite,
  TripMember,
  TripSnapshotResponse,
} from '../src/types/api';
import type {
  Day,
  HistoryEvent,
  Item,
  Leg,
  Trip,
} from '../src/types/trip';

function asStringArray(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => (typeof entry === 'string' ? [entry] : []));
  }
  return [];
}

function asSerializedJson(value: Prisma.JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value ?? []);
}

export function serializePhotoUrls(value: unknown): Prisma.InputJsonValue {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

export function serializeAvailabilityWindows(value: unknown): Prisma.InputJsonValue {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value as Prisma.InputJsonValue;
  }
  return [];
}

export function toTripDto(record: TripRecord): Trip {
  return {
    id: record.id,
    name: record.name,
    baseTimezone: record.baseTimezone,
    startDate: record.startDate,
    endDate: record.endDate,
    defaultMode: record.defaultMode as Trip['defaultMode'],
    startLat: record.startLat,
    startLng: record.startLng,
    startName: record.startName,
    startAddress: record.startAddress,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    updatedByUserId: record.updatedByUserId,
  };
}

export function toDayDto(record: DayRecord): Day {
  return {
    dayId: record.dayId,
    date: record.date,
    label: record.label,
    colorHex: record.colorHex,
    dayStart: record.dayStart,
    dayEnd: record.dayEnd,
    timezone: record.timezone,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    updatedByUserId: record.updatedByUserId,
  };
}

export function toItemDto(record: ItemRecord): Item {
  return {
    itemId: record.itemId,
    dayId: record.dayId,
    placeId: record.placeId,
    placeName: record.placeName,
    lat: record.lat,
    lng: record.lng,
    address: record.address,
    type: record.type as Item['type'],
    scheduledStart: record.scheduledStart,
    scheduledEnd: record.scheduledEnd,
    durationMinutes: record.durationMinutes,
    notesMd: record.notesMd,
    photoUrls: asStringArray(record.photoUrls),
    availabilityWindows: asSerializedJson(record.availabilityWindows),
    isOptional: record.isOptional,
    priority: record.priority,
    sortOrder: record.sortOrder,
    destLat: record.destLat,
    destLng: record.destLng,
    destName: record.destName,
    destAddress: record.destAddress,
    transportMode: record.transportMode as Item['transportMode'],
    itemRouteType: record.itemRouteType as Item['itemRouteType'],
    itemRoutePathEncoded: record.itemRoutePathEncoded,
    itemRouteDistanceMeters: record.itemRouteDistanceMeters,
    itemRouteDurationMinutes: record.itemRouteDurationMinutes,
    timelineLocked: record.timelineLocked,
    travelFromItemId: record.travelFromItemId,
    travelToItemId: record.travelToItemId,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    updatedByUserId: record.updatedByUserId,
  };
}

export function toLegDto(record: LegRecord): Leg {
  return {
    legId: record.legId,
    fromItemId: record.fromItemId,
    toItemId: record.toItemId,
    mode: record.mode as Leg['mode'],
    otherModeLabel: record.otherModeLabel ?? undefined,
    departure: record.departure,
    arrival: record.arrival,
    durationMinutes: record.durationMinutes,
    distanceMeters: record.distanceMeters,
    routePathEncoded: record.routePathEncoded,
    routeType: record.routeType as Leg['routeType'],
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    updatedByUserId: record.updatedByUserId,
  };
}

export function toHistoryDto(record: HistoryEventRecord): HistoryEvent {
  return {
    eventId: record.eventId,
    timestamp: record.timestamp.toISOString(),
    userId: record.userId,
    userName: record.userName,
    entityType: record.entityType as HistoryEvent['entityType'],
    entityId: record.entityId,
    field: record.field,
    oldValue: record.oldValue,
    newValue: record.newValue,
    itemId: record.itemId,
  };
}

export function toMemberDto(
  record: TripMemberRecord & { user: User },
): TripMember {
  return {
    memberId: record.memberId,
    tripId: record.tripId,
    userId: record.userId,
    email: record.user.email,
    name: record.user.name,
    picture: record.user.picture,
    role: record.role === 'OWNER' ? 'owner' : 'editor',
    createdAt: record.createdAt.toISOString(),
  };
}

export function toInviteDto(
  record: TripInviteRecord & { invitedBy: User },
): TripInvite {
  return {
    inviteId: record.inviteId,
    tripId: record.tripId,
    email: record.email,
    role: record.role === 'OWNER' ? 'owner' : 'editor',
    invitedByUserId: record.invitedByUserId,
    invitedByName: record.invitedBy.name,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toSnapshotResponse(params: {
  trip: TripRecord;
  days: DayRecord[];
  items: ItemRecord[];
  legs: LegRecord[];
  history: HistoryEventRecord[];
  members: Array<TripMemberRecord & { user: User }>;
  invites: Array<TripInviteRecord & { invitedBy: User }>;
}): TripSnapshotResponse {
  return {
    trip: toTripDto(params.trip),
    days: params.days.map(toDayDto).sort((a, b) => a.date.localeCompare(b.date)),
    items: params.items.map(toItemDto).sort((a, b) => a.sortOrder - b.sortOrder),
    legs: params.legs.map(toLegDto),
    history: params.history.map(toHistoryDto),
    members: params.members.map(toMemberDto),
    pendingInvites: params.invites.map(toInviteDto),
    meta: {},
  };
}
