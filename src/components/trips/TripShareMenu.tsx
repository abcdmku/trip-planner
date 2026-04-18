import { useEffect, useRef, useState } from 'react';
import { Share2, X, UserPlus, Loader2 } from 'lucide-react';
import type { TripInvite, TripMember } from '@/types/api';

interface TripShareMenuProps {
  canManage: boolean;
  members: TripMember[];
  pendingInvites: TripInvite[];
  currentUserId?: string;
  onInvite: (payload: { email: string; role: 'owner' | 'editor' }) => Promise<void> | void;
  onDeleteInvite: (inviteId: string) => Promise<void> | void;
  onDeleteMember: (member: TripMember) => Promise<void> | void;
  isInviting?: boolean;
}

export function TripShareMenu({
  canManage,
  members,
  pendingInvites,
  currentUserId,
  onInvite,
  onDeleteInvite,
  onDeleteMember,
  isInviting = false,
}: TripShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'editor'>('editor');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-lg border border-theme px-3 py-2 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-theme bg-theme-elevated p-4 shadow-theme-lg">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-theme">Trip Access</h3>
            <p className="text-xs text-theme-tertiary">
              Owners can invite editors and manage members.
            </p>
          </div>

          {canManage && (
            <form
              className="mb-4 space-y-2 rounded-xl border border-theme-subtle bg-theme p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!email.trim()) return;
                void Promise.resolve(onInvite({ email: email.trim(), role })).then(() => {
                  setEmail('');
                  setRole('editor');
                });
              }}
            >
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="input flex-1"
                  placeholder="collaborator@example.com"
                />
                <select value={role} onChange={(event) => setRole(event.target.value as 'owner' | 'editor')} className="input w-24">
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isInviting || !email.trim()}
                className="btn-primary flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-semibold"
              >
                {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Invite
              </button>
            </form>
          )}

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-tertiary">
                Members
              </div>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.memberId} className="flex items-center gap-2 rounded-xl border border-theme-subtle px-3 py-2">
                    <img src={member.picture} alt={member.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-theme">{member.name}</div>
                      <div className="truncate text-[11px] text-theme-tertiary">{member.email}</div>
                    </div>
                    <span className="rounded-full bg-theme-subtle px-2 py-0.5 text-[10px] font-semibold uppercase text-theme-secondary">
                      {member.role}
                    </span>
                    {canManage && member.userId !== currentUserId && member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => void onDeleteMember(member)}
                        className="rounded-lg p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-red-500"
                        aria-label={`Remove ${member.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-tertiary">
                Pending Invites
              </div>
              {pendingInvites.length === 0 ? (
                <div className="rounded-xl border border-dashed border-theme-subtle px-3 py-2 text-xs text-theme-tertiary">
                  No pending invites
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div key={invite.inviteId} className="flex items-center gap-2 rounded-xl border border-theme-subtle px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-theme">{invite.email}</div>
                        <div className="truncate text-[11px] text-theme-tertiary">
                          Invited by {invite.invitedByName}
                        </div>
                      </div>
                      <span className="rounded-full bg-theme-subtle px-2 py-0.5 text-[10px] font-semibold uppercase text-theme-secondary">
                        {invite.role}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => void onDeleteInvite(invite.inviteId)}
                          className="rounded-lg p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-red-500"
                          aria-label={`Cancel invite for ${invite.email}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
