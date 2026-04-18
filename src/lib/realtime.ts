import type { PresenceItemPreview, TripEventEnvelope } from '@/types/api';

export function isRemoteTripEvent(
  event: TripEventEnvelope,
  currentUserId: string,
  localConnectionId: string | null,
): boolean {
  if (event.actorConnectionId != null) {
    return event.actorConnectionId !== localConnectionId;
  }

  return event.actorUserId !== currentUserId;
}

export function shouldRefetchTripForEvent(
  event: TripEventEnvelope,
  currentSnapshotExists: boolean,
  isRemoteChange: boolean,
): boolean {
  return (
    event.type === 'snapshot.restored' ||
    isRemoteChange ||
    !currentSnapshotExists ||
    event.actorConnectionId == null
  );
}

export function mergeTripItemPreviewDiff(
  existing: PresenceItemPreview[],
  previewUpsert: PresenceItemPreview[],
): PresenceItemPreview[] {
  const next = new Map(existing.map((preview) => [preview.connectionId, preview]));
  for (const preview of previewUpsert) {
    next.set(preview.connectionId, preview);
  }
  return [...next.values()];
}

export function removeTripItemPreviewConnections(
  existing: PresenceItemPreview[],
  connectionIds: string[],
): PresenceItemPreview[] {
  if (connectionIds.length === 0) return existing;
  const removeSet = new Set(connectionIds);
  return existing.filter((preview) => !removeSet.has(preview.connectionId));
}

export function getCommittedPreviewConnectionIds(event: TripEventEnvelope): string[] {
  if (!event.actorConnectionId) return [];

  switch (event.type) {
    case 'item.updated':
    case 'item.deleted':
    case 'items.reordered':
    case 'snapshot.restored':
      return [event.actorConnectionId];
    default:
      return [];
  }
}
