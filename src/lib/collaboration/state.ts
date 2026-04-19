import type {
  CollaborationManipulationKind,
  CollaborationParticipant,
  PresenceCursor,
  PresenceItemPreview,
  PresenceManipulation,
  PresencePreviewMode,
  PresenceSelection,
  PresenceViewport,
  RemoteObjectPresence,
} from '@/types/collaboration';

function previewModeToManipulationKind(mode: PresencePreviewMode | undefined): CollaborationManipulationKind {
  switch (mode) {
    case 'resize':
      return 'resize';
    case 'edit':
      return 'edit';
    case 'move':
      return 'move';
    default:
      return 'transform';
  }
}

export function buildManipulationFromPreview(preview: PresenceItemPreview): PresenceManipulation {
  return {
    connectionId: preview.connectionId,
    tripId: preview.tripId,
    userId: preview.userId,
    objectId: preview.itemId,
    kind: previewModeToManipulationKind(preview.mode),
    label:
      preview.mode === 'resize'
        ? 'Resizing'
        : preview.mode === 'edit'
          ? 'Editing'
          : preview.mode === 'move'
            ? 'Moving'
            : 'Transforming',
    updatedAt: preview.updatedAt,
  };
}

export function cloneParticipant(participant: CollaborationParticipant): CollaborationParticipant {
  return {
    ...participant,
    cursor: participant.cursor ? { ...participant.cursor } : null,
    itemPreview: participant.itemPreview ? { ...participant.itemPreview } : null,
    selection: participant.selection
      ? {
          ...participant.selection,
          objectIds: [...participant.selection.objectIds],
        }
      : null,
    viewport: participant.viewport
      ? {
          ...participant.viewport,
        mapCamera: participant.viewport.mapCamera
            ? {
                center: { ...participant.viewport.mapCamera.center },
                zoom: participant.viewport.mapCamera.zoom,
              }
            : participant.viewport.mapCamera ?? null,
          mapOpenLocation: participant.viewport.mapOpenLocation
            ? {
                ...participant.viewport.mapOpenLocation,
                position: { ...participant.viewport.mapOpenLocation.position },
              }
            : participant.viewport.mapOpenLocation ?? null,
        }
      : null,
    manipulation: participant.manipulation ? { ...participant.manipulation } : null,
  };
}

export function participantsToCursors(participants: CollaborationParticipant[]): PresenceCursor[] {
  return participants.flatMap((participant) => (participant.cursor ? [{ ...participant.cursor }] : []));
}

export function participantsToItemPreviews(participants: CollaborationParticipant[]): PresenceItemPreview[] {
  return participants.flatMap((participant) =>
    participant.itemPreview ? [{ ...participant.itemPreview }] : [],
  );
}

export function participantsToSelections(participants: CollaborationParticipant[]): PresenceSelection[] {
  return participants.flatMap((participant) =>
    participant.selection
      ? [
          {
            ...participant.selection,
            objectIds: [...participant.selection.objectIds],
          },
        ]
      : [],
  );
}

export function participantsToViewports(participants: CollaborationParticipant[]): PresenceViewport[] {
  return participants.flatMap((participant) =>
    participant.viewport
      ? [
          {
            ...participant.viewport,
            mapCamera: participant.viewport.mapCamera
              ? {
                  center: { ...participant.viewport.mapCamera.center },
                  zoom: participant.viewport.mapCamera.zoom,
                }
              : participant.viewport.mapCamera ?? null,
            mapOpenLocation: participant.viewport.mapOpenLocation
              ? {
                  ...participant.viewport.mapOpenLocation,
                  position: { ...participant.viewport.mapOpenLocation.position },
                }
              : participant.viewport.mapOpenLocation ?? null,
          },
        ]
      : [],
  );
}

export function participantsToManipulations(participants: CollaborationParticipant[]): PresenceManipulation[] {
  return participants.flatMap((participant) =>
    participant.manipulation ? [{ ...participant.manipulation }] : [],
  );
}

export function buildRemoteObjectPresenceById(
  participants: CollaborationParticipant[],
  localConnectionId: string | null | undefined,
): Map<string, RemoteObjectPresence[]> {
  const next = new Map<string, RemoteObjectPresence[]>();

  for (const participant of participants) {
    if (participant.connectionId === localConnectionId) continue;

    const push = (objectId: string, presence: RemoteObjectPresence) => {
      next.set(objectId, [...(next.get(objectId) ?? []), presence]);
    };

    if (participant.itemPreview && participant.manipulation) {
      push(participant.itemPreview.itemId, {
        connectionId: participant.connectionId,
        userId: participant.userId,
        name: participant.name,
        picture: participant.picture,
        color: participant.color,
        kind: participant.manipulation.kind,
        label: participant.manipulation.label,
      });
      continue;
    }

    if (participant.selection?.primaryObjectId) {
      push(participant.selection.primaryObjectId, {
        connectionId: participant.connectionId,
        userId: participant.userId,
        name: participant.name,
        picture: participant.picture,
        color: participant.color,
        kind: 'selection',
        label: participant.selection.objectIds.length > 1 ? 'Selecting multiple' : 'Selected',
      });
    }
  }

  return next;
}
