import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Radio, ScanSearch } from 'lucide-react';
import type { CollaborationParticipant } from '@/types/collaboration';

interface ParticipantStripProps {
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

export function ParticipantStrip({
  participants,
  localConnectionId,
  followedConnectionId,
  onFollow,
  onJumpTo,
  onStopFollowing,
}: ParticipantStripProps) {
  const [openConnectionId, setOpenConnectionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenConnectionId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const visibleParticipants = useMemo(
    () => participants.filter((participant) => participant.connectionId !== localConnectionId),
    [localConnectionId, participants],
  );

  if (visibleParticipants.length === 0) {
    return (
      <div className="hidden items-center gap-2 rounded-full border border-dashed border-theme px-3 py-1.5 text-xs text-theme-tertiary lg:flex">
        <Radio className="h-3.5 w-3.5" />
        Solo
      </div>
    );
  }

  return (
    <div ref={containerRef} className="hidden items-center gap-2 lg:flex">
      {visibleParticipants.map((participant) => {
        const isFollowing = participant.connectionId === followedConnectionId;
        const statusLabel = buildStatusLabel(participant);

        return (
          <div key={participant.connectionId} className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenConnectionId((current) =>
                  current === participant.connectionId ? null : participant.connectionId,
                )
              }
              className={`flex items-center gap-2 rounded-full border px-2 py-1.5 transition-colors ${
                isFollowing
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-theme hover:bg-theme-subtle'
              }`}
            >
              <div
                className="rounded-full p-[1px]"
                style={{ backgroundColor: participant.color }}
              >
                <img
                  src={participant.picture}
                  alt={participant.name}
                  className="h-7 w-7 rounded-full border border-white/90"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0 text-left">
                <div className="max-w-32 truncate text-xs font-semibold text-theme">{participant.name}</div>
                <div className="max-w-32 truncate text-[11px] text-theme-tertiary">{statusLabel}</div>
              </div>
            </button>

            {openConnectionId === participant.connectionId && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-theme bg-theme-elevated p-3 shadow-theme-lg">
                <div className="mb-2">
                  <div className="truncate text-sm font-semibold text-theme">{participant.name}</div>
                  <div className="truncate text-xs text-theme-tertiary">{statusLabel}</div>
                </div>

                <div className="space-y-2">
                  {isFollowing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenConnectionId(null);
                        onStopFollowing();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-theme px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Stop Following
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenConnectionId(null);
                        onFollow(participant.connectionId);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-theme px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      Follow View
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOpenConnectionId(null);
                      onJumpTo(participant.connectionId);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl border border-theme px-3 py-2 text-xs font-semibold text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
                  >
                    <ScanSearch className="h-3.5 w-3.5" />
                    Jump To User
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
