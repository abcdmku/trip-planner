import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  House,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { StatusMessage } from '@component-lib/sync/StatusMessage';

export type NavbarTheme = 'light' | 'dark' | 'system';

export interface NavbarProps {
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  user?: { name: string; picture: string };
  onLogout?: () => void | Promise<void>;
  onHomeClick?: () => void;
  participantStrip?: ReactNode;
  shareControl?: ReactNode;
  activeCollaborators?: Array<{ userId: string; name: string; picture: string; color: string }>;
  followStatus?: ReactNode;
  theme?: NavbarTheme;
  onThemeChange?: (theme: NavbarTheme) => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] satisfies ReadonlyArray<{
  value: NavbarTheme;
  label: string;
  Icon: typeof Sun;
}>;

function SyncBadge({ status }: { status: 'synced' | 'syncing' | 'error' | 'offline' }) {
  if (status === 'syncing') {
    return (
      <StatusMessage
        label="Syncing"
        tone="info"
        variant="badge"
        icon={<RefreshCw className="h-3.5 w-3.5 animate-spin" />}
      />
    );
  }
  if (status === 'error') {
    return <StatusMessage label="Sync error" tone="danger" variant="badge" />;
  }
  if (status === 'offline') {
    return <StatusMessage label="Offline" tone="warning" variant="badge" />;
  }
  return <StatusMessage label="Saved" tone="success" variant="badge" />;
}

function CollaboratorSummary({
  activeCollaborators,
  participantStrip,
  open,
  onToggle,
}: {
  activeCollaborators: Array<{ userId: string; name: string; picture: string; color: string }>;
  participantStrip?: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const visibleCollaborators = activeCollaborators.slice(0, 2);
  const overflowCollaboratorCount = Math.max(activeCollaborators.length - visibleCollaborators.length, 0);
  const hasInteractiveStrip = Boolean(participantStrip);

  if (visibleCollaborators.length === 0 && !hasInteractiveStrip) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Open collaborators panel"
      className="flex items-center rounded-full border border-theme bg-theme px-1.5 py-1 shadow-theme-sm transition-colors hover:bg-theme-subtle"
    >
      {visibleCollaborators.length > 0 ? (
        <div className="flex items-center -space-x-2">
          {visibleCollaborators.map((collaborator) => (
            <span
              key={collaborator.userId}
              className="rounded-full p-[1px] ring-2 ring-theme"
              style={{ backgroundColor: collaborator.color }}
              title={collaborator.name}
            >
              <img
                src={collaborator.picture}
                alt={collaborator.name}
                className="h-6 w-6 rounded-full border border-white/90 sm:h-7 sm:w-7"
                referrerPolicy="no-referrer"
              />
            </span>
          ))}
          {overflowCollaboratorCount > 0 ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-theme-subtle text-[9px] font-semibold text-theme-secondary ring-2 ring-theme sm:h-7 sm:w-7 sm:text-[10px]">
              +{overflowCollaboratorCount}
            </span>
          ) : null}
        </div>
      ) : (
        <span className="px-2 text-xs font-semibold text-theme-secondary">Team</span>
      )}
    </button>
  );
}

function SyncToast({ status }: { status: 'error' | 'offline' }) {
  const isError = status === 'error';
  return (
    <div className="px-3 pb-3 sm:px-5">
      <div
        className={`inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium shadow-theme-sm ${
          isError
            ? 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300'
            : 'border-amber-500/25 bg-amber-500/12 text-amber-800 dark:text-amber-200'
        }`}
        role="status"
      >
        <span className="shrink-0">{isError ? 'Sync error' : 'Offline mode'}</span>
        <span className="min-w-0 truncate opacity-85">
          {isError ? 'Changes will retry automatically.' : 'Working locally until the connection returns.'}
        </span>
      </div>
    </div>
  );
}

export function Navbar({
  tripName,
  onTripNameChange,
  syncStatus = 'synced',
  user,
  onLogout,
  onHomeClick,
  participantStrip,
  shareControl,
  activeCollaborators = [],
  followStatus,
  theme = 'system',
  onThemeChange,
}: NavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tripName ?? '');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const collaborationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setEditValue(tripName ?? '');
  }, [isEditing, tripName]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (collaborationRef.current && !collaborationRef.current.contains(event.target as Node)) {
        setCollaborationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const commitEdit = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue.trim() !== tripName) {
      onTripNameChange?.(editValue.trim());
    } else {
      setEditValue(tripName ?? '');
    }
  };

  const participantCountLabel = useMemo(() => {
    if (activeCollaborators.length === 0) return null;
    return `${activeCollaborators.length} live`;
  }, [activeCollaborators.length]);

  const showThemeControls = Boolean(onThemeChange);
  const showCollaboratorSummary = activeCollaborators.length > 0 || Boolean(participantStrip);
  const inlineSyncStatus = syncStatus === 'synced' || syncStatus === 'syncing' ? syncStatus : null;
  const toastSyncStatus = syncStatus === 'error' || syncStatus === 'offline' ? syncStatus : null;

  return (
    <nav className="sticky top-0 z-40 border-b border-theme bg-theme-elevated/95 backdrop-blur">
      <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-5">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onHomeClick}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-theme bg-theme shadow-theme-sm transition-colors hover:bg-theme-subtle"
            aria-label="Go to trips home"
            title="Back to trips"
          >
            <House className="h-4 w-4 text-accent" />
          </button>
        </div>

        <div className="min-w-0">
          {tripName !== undefined ? (
            <div className="min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitEdit();
                    if (event.key === 'Escape') {
                      setEditValue(tripName);
                      setIsEditing(false);
                    }
                  }}
                  className="input w-full max-w-full text-sm font-semibold sm:max-w-[420px]"
                  aria-label="Edit trip name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="max-w-full truncate text-left text-sm font-semibold text-theme transition-colors hover:text-accent sm:text-base"
                  title="Click to edit"
                >
                  {tripName || 'Untitled Trip'}
                </button>
              )}

              <div className="mt-1 flex items-center gap-2">
                {inlineSyncStatus ? <SyncBadge status={inlineSyncStatus} /> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-2.5">
          {shareControl ? <div className="hidden md:block">{shareControl}</div> : null}

          {followStatus ? (
            <div className="hidden min-w-0 max-w-[220px] items-center overflow-hidden lg:flex [&>*]:max-w-full">
              {followStatus}
            </div>
          ) : null}

          {showCollaboratorSummary ? (
            <div className="relative" ref={collaborationRef}>
              <CollaboratorSummary
                activeCollaborators={activeCollaborators}
                participantStrip={participantStrip}
                open={collaborationOpen}
                onToggle={() => setCollaborationOpen((current) => !current)}
              />

              {collaborationOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg">
                  <div className="border-b border-theme-subtle px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                      Collaboration
                    </p>
                    <p className="text-sm font-semibold text-theme">
                      {participantCountLabel ?? 'Workspace'}
                    </p>
                  </div>

                  {activeCollaborators.length > 0 ? (
                    <div className="space-y-2 px-4 py-3">
                      {activeCollaborators.map((collaborator) => (
                        <div
                          key={collaborator.userId}
                          className="flex items-center gap-3 rounded-2xl bg-theme-subtle px-3 py-2"
                        >
                          <span
                            className="rounded-full p-[1px]"
                            style={{ backgroundColor: collaborator.color }}
                          >
                            <img
                              src={collaborator.picture}
                              alt={collaborator.name}
                              className="h-8 w-8 rounded-full border border-white/90"
                              referrerPolicy="no-referrer"
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-theme">
                              {collaborator.name}
                            </p>
                            <p className="text-xs text-theme-tertiary">Live in the workspace</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {participantStrip ? (
                    <div className="border-t border-theme-subtle px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                        Jump Or Follow
                      </p>
                      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&>*]:!flex [&>*]:!items-center [&>*]:!gap-2">
                        {participantStrip}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="group flex items-center gap-1 rounded-full border border-theme bg-theme px-1.5 py-1 shadow-theme-sm transition-colors hover:bg-theme-subtle"
                aria-expanded={profileMenuOpen}
                aria-label={`Open profile menu for ${user.name}`}
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <ChevronDown
                  className={`h-3.5 w-3.5 text-theme-tertiary transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg">
                  <div className="flex items-center gap-3 border-b border-theme-subtle px-4 py-4">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-11 w-11 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-theme">{user.name}</p>
                      <p className="text-xs text-theme-tertiary">Workspace settings</p>
                    </div>
                  </div>

                  {showThemeControls ? (
                    <div className="border-b border-theme-subtle px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                        Appearance
                      </p>
                      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-theme-subtle p-1">
                        {THEME_OPTIONS.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              onThemeChange?.(value);
                              setProfileMenuOpen(false);
                            }}
                            aria-label={`${label} theme`}
                            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                              theme === value
                                ? 'bg-theme text-accent shadow-theme-sm'
                                : 'text-theme-secondary hover:bg-theme hover:text-theme'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {toastSyncStatus ? <SyncToast status={toastSyncStatus} /> : null}
    </nav>
  );
}
