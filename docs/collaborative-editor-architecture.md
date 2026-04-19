# Collaborative Editor Architecture

## Decisions

- Persisted document state stays on the existing HTTP mutation + `trip.event` path.
- Ephemeral collaboration state stays in websocket memory only.
- Presence is room-scoped by `tripId`.
- The server is authoritative for presence cleanup.
- The client is authoritative for follow mode state and exit behavior.

## Architecture

### Persisted channel

- Source of truth: database rows for `trip`, `day`, `item`, `leg`.
- Transport: existing REST mutations in `server/app.ts`.
- Fan-out: `trip.event`.
- Conflict boundary: committed mutations only.

### Ephemeral channel

- Source of truth: in-memory `PresenceManager` room state in `server/presence.ts`.
- Transport: websocket presence messages.
- Domains:
  - cursor
  - item preview
  - selection
  - viewport
  - derived manipulation metadata
- Cleanup:
  - client heartbeat every 10s
  - server timeout at 25s
  - connection removal purges all ephemeral state

### Frontend ownership

- `RealtimeContext`: socket lifecycle, retries, heartbeat, throttled outbound writes.
- `collaborationStore`: external ephemeral store for presence rooms.
- `useTripCollaboration`: derived selectors for cursors, previews, selections, viewports, and item-level badges.
- `VerticalTimeline`: local viewport publisher plus follow/jump consumer.

## Event Contracts

### Client -> server

```ts
type RealtimeClientMessage =
  | { type: 'trip.subscribe'; tripId: string }
  | { type: 'trip.unsubscribe'; tripId: string }
  | { type: 'presence.heartbeat' }
  | { type: 'presence.cursor'; tripId: string; x: number; y: number }
  | { type: 'presence.cursor.clear'; tripId: string }
  | {
      type: 'presence.item-preview';
      tripId: string;
      itemId: string;
      dayId: string;
      scheduledStart: string;
      scheduledEnd: string;
      durationMinutes: number;
      mode?: 'move' | 'resize' | 'append' | 'point' | 'create' | 'edit' | 'transform';
    }
  | { type: 'presence.item-preview.clear'; tripId: string }
  | {
      type: 'presence.selection';
      tripId: string;
      objectIds: string[];
      primaryObjectId: string | null;
    }
  | { type: 'presence.selection.clear'; tripId: string }
  | {
      type: 'presence.viewport';
      tripId: string;
      viewMode: 'day' | 'multi' | 'map' | 'canvas';
      focusedDayId: string | null;
      scrollLeft: number;
      scrollTop: number;
      zoom: number;
    }
  | { type: 'presence.viewport.clear'; tripId: string };
```

### Server -> client

```ts
type RealtimeServerMessage =
  | {
      type: 'presence.self';
      connectionId: string;
      heartbeatIntervalMs?: number;
      stalePresenceTtlMs?: number;
    }
  | {
      type: 'presence.snapshot';
      tripId: string;
      participants: CollaborationParticipant[];
      cursors: PresenceCursor[];
      itemPreviews: PresenceItemPreview[];
    }
  | {
      type: 'presence.diff';
      tripId: string;
      participantsUpsert: CollaborationParticipant[];
      removeConnectionIds: string[];
      upsert: PresenceCursor[];
      previewUpsert: PresenceItemPreview[];
      previewRemoveConnectionIds: string[];
    }
  | { type: 'trip.event'; event: TripEventEnvelope };
```

## Backend Plan

### Current implementation scaffold

- `server/presence.ts`
  - participant record per connection per room
  - cursor / preview / selection / viewport attached to the participant
  - manipulation derived from preview mode
  - heartbeat timeout cleanup
- `server/app.ts`
  - new zod schemas for selection, viewport, heartbeat, preview mode
  - websocket handlers forward those messages to `PresenceManager`
  - `presence.self` now advertises heartbeat timing

### Next backend phase

- Add version-aware patch mutations for concurrent writes.
- Add resumable websocket sessions if reconnect identity preservation becomes necessary.
- Add room-level diff batching at 30Hz when participant counts increase.

## Frontend Plan

### Current implementation scaffold

- `src/contexts/RealtimeContext.tsx`
  - throttled cursor, preview, and viewport sending
  - local selection broadcast
  - heartbeat scheduling
  - external collaboration store updates from snapshot/diff messages
- `src/stores/collaboration-store.ts`
  - room-scoped participant snapshot/diff merge
- `src/hooks/useCollaboration.ts`
  - derived presence selectors
- `src/components/presence/ParticipantStrip.tsx`
  - header participant list
  - follow / jump actions
- `src/components/presence/FollowModeBanner.tsx`
  - active follow banner with explicit exit
- `src/components/presence/CursorPresenceOverlay.tsx`
  - interpolated transform-based remote cursors
- `src/components/timeline/vertical/*`
  - remote selection/manipulation badges on timeline items
  - viewport publish / follow / jump hooks at the timeline boundary

### Next frontend phase

- Add remote presence badges to itinerary cards and object inspectors.
- Add explicit text-edit manipulation presence.
- Upgrade viewport sync for deep day-view scroll state.

## Conflict Strategy

- Presence never blocks persisted writes by itself.
- Remote manipulation is a soft claim, not a database lock.
- Same object + same transform kind:
  - show the remote owner
  - discourage starting a competing transform
  - final persisted write still resolves on the server
- Persisted conflicts:
  - keep current server-authoritative commit model
  - phase 2 adds `expectedVersion` checks and field-level patch payloads
- Commit events clear matching ephemeral preview/manipulation state immediately.

## Performance Strategy

- Cursor send throttle: 41ms max.
- Preview send throttle: 50ms max.
- Viewport send throttle: 120ms max.
- Heartbeat: 10s.
- Presence timeout: 25s.
- Cursor interpolation: requestAnimationFrame + transform-based rendering.
- Ephemeral room state lives outside React context state to avoid provider-wide rerenders.

## Phased Rollout

1. Presence foundation
- Participant records
- heartbeat / stale cleanup
- selection and viewport events
- participant strip and cursor interpolation

2. Collaborative manipulation
- explicit edit presence
- field/version conflict responses
- richer object overlays across all surfaces

3. Scaling and polish
- room diff batching
- resumable sessions
- late-join snapshot hydration tests
- stronger conflict UX

## Acceptance Criteria

- Participant list in the top header shows current active collaborators.
- Remote cursors update live and fade smoothly.
- Remote selections are visible on timeline objects.
- Remote move/resize previews are visible and attributed.
- Follow mode syncs the viewport and can be exited explicitly.
- Jump-to-user moves the viewport to the remote user state.
- Disconnects do not leave ghost cursors or stale manipulation badges beyond timeout.
- Reconnect restores trip subscriptions and replays local selection/viewport state.
- Persisted document edits still flow through `trip.event`.

## Test Plan

### Unit

- collaboration store snapshot/diff merge
- remote object badge derivation
- cursor interpolation helper behavior
- preview mode conversion

### Server unit

- snapshot payload contains participants
- selection / viewport updates patch participant state
- heartbeat timeout removes stale participants

### Integration

- websocket subscribe -> snapshot -> diff for cursor, preview, selection, viewport
- persisted update clears matching preview/manipulation state
- reconnect resubscribe keeps collaboration state coherent

### UI

- participant strip actions
- follow mode banner exit
- cursor overlay hides local cursor and renders remote cursors
- remote item badges render for selection and manipulation
