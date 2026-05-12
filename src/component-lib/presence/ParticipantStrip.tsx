import { useMemo } from 'react';
import { Crosshair, Radio, ScanSearch, type LucideIcon } from 'lucide-react';
import type { CollaborationParticipant } from '@/types/collaboration';

export interface ParticipantStripProps {
  participants: CollaborationParticipant[];
  localConnectionId?: string | null;
  followedConnectionId?: string | null;
  onFollow: (connectionId: string) => void;
  onJumpTo: (connectionId: string) => void;
  onStopFollowing: () => void;
}

function buildStatusLabel(participant: CollaborationParticipant): string {
  if (participant.manipulation) {
    return `${participant.manipulation.label} ${participant.manipulation.objectId}`;
  }

  if (participant.selection?.primaryObjectId) {
    return `Selected ${participant.selection.primaryObjectId}`;
  }

  return participant.status === 'reconnecting' ? 'Reconnecting' : 'Present';
}

interface ParticipantActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ParticipantActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: ParticipantActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 flex-none items-center justify-center rounded-theme-control border text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme ${
        active ? 'border-accent/40 bg-accent/10 text-accent' : 'border-theme bg-theme'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SoloParticipantState() {
  return (
    <div className="hidden w-full items-center gap-2 rounded-theme-control border border-dashed border-theme px-3 py-2 text-xs text-theme-tertiary lg:flex">
      <Radio className="h-3.5 w-3.5" />
      Solo
    </div>
  );
}

interface ParticipantRowProps {
  participant: CollaborationParticipant;
  statusLabel: string;
  isFollowing: boolean;
  onFollow: (connectionId: string) => void;
  onJumpTo: (connectionId: string) => void;
  onStopFollowing: () => void;
}

function ParticipantRow({
  participant,
  statusLabel,
  isFollowing,
  onFollow,
  onJumpTo,
  onStopFollowing,
}: ParticipantRowProps) {
  const followLabel = isFollowing
    ? `Stop following ${participant.name}`
    : `Follow ${participant.name}`;
  const jumpLabel = `Jump to ${participant.name}`;

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-theme-control border px-3 py-2 ${
        isFollowing ? 'border-accent/35 bg-accent/10' : 'border-transparent bg-theme'
      }`}
    >
      <span className="rounded-full p-[1px]" style={{ backgroundColor: participant.color }}>
        <img
          src={participant.picture}
          alt={participant.name}
          className="h-8 w-8 rounded-full"
          referrerPolicy="no-referrer"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-theme">{participant.name}</p>
        <p className="truncate text-xs text-theme-tertiary">{statusLabel}</p>
      </div>
      <div
        className="ml-auto flex flex-none items-center gap-1"
        role="group"
        aria-label={`${participant.name} actions`}
      >
        <ParticipantActionButton
          icon={Crosshair}
          label={followLabel}
          active={isFollowing}
          onClick={() => {
            if (isFollowing) {
              onStopFollowing();
              return;
            }
            onFollow(participant.connectionId);
          }}
        />
        <ParticipantActionButton
          icon={ScanSearch}
          label={jumpLabel}
          onClick={() => {
            onJumpTo(participant.connectionId);
          }}
        />
      </div>
    </div>
  );
}

export function ParticipantStrip({
  participants,
  localConnectionId,
  followedConnectionId,
  onFollow,
  onJumpTo,
  onStopFollowing,
}: ParticipantStripProps) {
  const visibleParticipants = useMemo(
    () => participants.filter((participant) => participant.connectionId !== localConnectionId),
    [localConnectionId, participants],
  );

  if (visibleParticipants.length === 0) {
    return <SoloParticipantState />;
  }

  return (
    <div className="hidden w-full min-w-0 flex-col gap-2 lg:flex">
      {visibleParticipants.map((participant) => {
        const isFollowing = participant.connectionId === followedConnectionId;
        const statusLabel = buildStatusLabel(participant);

        return (
          <ParticipantRow
            key={participant.connectionId}
            participant={participant}
            isFollowing={isFollowing}
            statusLabel={statusLabel}
            onFollow={onFollow}
            onJumpTo={onJumpTo}
            onStopFollowing={onStopFollowing}
          />
        );
      })}
    </div>
  );
}
