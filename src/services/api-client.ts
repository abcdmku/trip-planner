import type {
  SessionUser,
  TripInvite,
  TripListItem,
  TripMember,
  TripSnapshotResponse,
} from '@/types/api';
import type { Day, Item, Leg, Trip } from '@/types/trip';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return undefined;
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: string }).error)
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export function buildRealtimeUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export async function getSession(): Promise<SessionUser | null> {
  const response = await request<{ user: SessionUser | null }>('/api/session', {
    method: 'GET',
  });
  return response.user;
}

export async function beginGoogleAuth(nextPath: string): Promise<string> {
  const response = await request<{ url: string }>('/api/auth/google/start', {
    method: 'POST',
    body: JSON.stringify({ nextPath }),
  });
  return response.url;
}

export async function logoutSession(): Promise<void> {
  await request('/api/auth/logout', {
    method: 'POST',
  });
}

export async function listTrips(): Promise<TripListItem[]> {
  return request<TripListItem[]>('/api/trips', {
    method: 'GET',
  });
}

export async function createTrip(payload: {
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
}): Promise<Trip> {
  return request<Trip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTripSnapshot(tripId: string): Promise<TripSnapshotResponse> {
  return request<TripSnapshotResponse>(`/api/trips/${tripId}`, {
    method: 'GET',
  });
}

export async function updateTripRecord(tripId: string, trip: Trip): Promise<Trip> {
  return request<Trip>(`/api/trips/${tripId}`, {
    method: 'PATCH',
    body: JSON.stringify(trip),
  });
}

export async function getTripMembers(tripId: string): Promise<{
  members: TripMember[];
  pendingInvites: TripInvite[];
}> {
  return request(`/api/trips/${tripId}/members`, {
    method: 'GET',
  });
}

export async function createTripInvite(
  tripId: string,
  payload: { email: string; role: 'owner' | 'editor' },
): Promise<TripInvite> {
  return request(`/api/trips/${tripId}/invites`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTripInvite(tripId: string, inviteId: string): Promise<void> {
  await request(`/api/trips/${tripId}/invites/${inviteId}`, {
    method: 'DELETE',
  });
}

export async function deleteTripMember(tripId: string, memberId: string): Promise<void> {
  await request(`/api/trips/${tripId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function createDayRecord(tripId: string, day: Day): Promise<Day> {
  return request(`/api/trips/${tripId}/days`, {
    method: 'POST',
    body: JSON.stringify(day),
  });
}

export async function updateDayRecord(tripId: string, day: Day): Promise<Day> {
  return request(`/api/trips/${tripId}/days/${day.dayId}`, {
    method: 'PATCH',
    body: JSON.stringify(day),
  });
}

export async function deleteDayRecord(tripId: string, dayId: string): Promise<void> {
  await request(`/api/trips/${tripId}/days/${dayId}`, {
    method: 'DELETE',
  });
}

export async function createItemRecord(tripId: string, item: Item): Promise<Item> {
  return request(`/api/trips/${tripId}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateItemRecord(tripId: string, item: Item): Promise<Item> {
  return request(`/api/trips/${tripId}/items/${item.itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
}

export async function deleteItemRecord(tripId: string, itemId: string): Promise<void> {
  await request(`/api/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function reorderTripItems(
  tripId: string,
  payload: { dayId: string; orderedItemIds: string[] },
): Promise<Item[]> {
  return request(`/api/trips/${tripId}/items/reorder`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLegRecord(tripId: string, leg: Leg): Promise<Leg> {
  return request(`/api/trips/${tripId}/legs/${leg.legId}`, {
    method: 'PATCH',
    body: JSON.stringify(leg),
  });
}

export async function replaceTripLegs(tripId: string, legs: Leg[]): Promise<Leg[]> {
  return request(`/api/trips/${tripId}/legs`, {
    method: 'PUT',
    body: JSON.stringify(legs),
  });
}

export async function restoreTripSnapshot(
  tripId: string,
  snapshot: {
    trip: Trip;
    days: Day[];
    items: Item[];
    legs: Leg[];
  },
): Promise<TripSnapshotResponse> {
  return request(`/api/trips/${tripId}/snapshot`, {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
}
