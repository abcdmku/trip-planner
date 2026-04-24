import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut, Monitor, Moon, Sun, Users } from 'lucide-react';
import { TripPlannerLogo } from '../shared/TripPlannerLogo';
export type NavbarTheme = 'light' | 'dark' | 'system';

export interface NavbarProps {
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  compact?: boolean;
  user?: { name: string; picture: string };
  onLogout?: () => void | Promise<void>;
  onHomeClick?: () => void;
  participantStrip?: ReactNode;
  shareControl?: ReactNode;
  dataTransferControl?: ReactNode;
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

function CollaboratorSummary({
  activeCollaborators,
  participantStrip,
  open,
  onToggle,
  compact,
}: {
  activeCollaborators: Array<{ userId: string; name: string; picture: string; color: string }>;
  participantStrip?: ReactNode;
  open: boolean;
  onToggle: () => void;
  compact: boolean;
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
      className={`flex items-center rounded-theme-control transition-colors ${
        open ? 'bg-theme-subtle shadow-theme-sm' : 'bg-theme hover:bg-theme-subtle'
      }`}
    >
      {visibleCollaborators.length > 0 ? (
        compact ? (
          <span className="relative flex h-6 w-6 items-center justify-center">
            <Users className="h-3 w-3 text-theme-secondary" />
            <span className="absolute -right-1 top-0 flex h-3 min-w-3 items-center justify-center rounded-full bg-theme-border px-0.5 text-[7px] font-semibold leading-none text-theme">
              {activeCollaborators.length}
            </span>
          </span>
        ) : (
          <div className="flex items-center px-1.5 py-1">
            <div className="flex items-center -space-x-2">
              {visibleCollaborators.map((collaborator) => (
                <span
                  key={collaborator.userId}
                  className="rounded-full p-[1px]"
                  style={{ backgroundColor: collaborator.color }}
                  title={collaborator.name}
                >
                  <img
                    src={collaborator.picture}
                    alt={collaborator.name}
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </span>
              ))}
            </div>
            {overflowCollaboratorCount > 0 ? (
              <span className="ml-0.5 flex h-7 min-w-7 items-center justify-center text-[10px] font-semibold text-theme-secondary">
                +{overflowCollaboratorCount}
              </span>
            ) : null}
          </div>
        )
      ) : (
        <span className="px-2 py-1 text-xs font-semibold text-theme-secondary">Team</span>
      )}
    </button>
  );
}

function MenuPointer({ rightClassName, hidden }: { rightClassName: string; hidden: boolean }) {
  if (hidden) return null;

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -top-[9px] h-[9px] w-[18px] ${rightClassName}`}
    >
      <span className="absolute inset-0 bg-theme-border [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
      <span className="absolute left-[2px] top-[2px] h-[7px] w-[14px] bg-theme-elevated [clip-path:polygon(50%_0,0_100%,100%_100%)]" />
    </span>
  );
}

export function Navbar({
  tripName,
  onTripNameChange,
  compact = false,
  user,
  onLogout,
  onHomeClick,
  participantStrip,
  shareControl,
  dataTransferControl,
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
  const navRowClassName = compact
    ? 'grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-2 pl-1 pr-1 py-1.5'
    : 'grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 pl-4 pr-5 py-2';
  const homeButtonClassName = compact
    ? 'flex h-8 w-8 items-center justify-center rounded-theme-control bg-theme shadow-theme-sm transition-colors hover:bg-theme-subtle'
    : 'flex h-10 w-10 items-center justify-center rounded-theme-control bg-theme shadow-theme-sm transition-colors hover:bg-theme-subtle';
  const homeIconClassName = compact ? 'h-5 w-5' : 'h-6 w-6';
  const titleButtonClassName = compact
    ? 'max-w-full truncate text-left text-[13px] font-semibold text-theme transition-colors hover:text-accent'
    : 'max-w-full truncate text-left text-sm font-semibold text-theme transition-colors hover:text-accent sm:text-base';
  const rightSideClassName = compact
    ? 'flex min-w-0 items-center justify-end gap-1'
    : 'flex min-w-0 items-center justify-end gap-2.5';
  const collaboratorMenuClassName = compact
    ? 'fixed inset-x-2 top-[3.75rem] z-50 w-auto rounded-theme-shell border border-theme bg-theme-elevated shadow-theme-lg'
    : 'absolute right-0 top-full z-50 mt-1.5 w-[min(320px,calc(100vw-2rem))] rounded-theme-shell border border-theme bg-theme-elevated shadow-theme-lg';
  const profileMenuClassName = compact
    ? 'fixed inset-x-2 top-[3.75rem] z-50 w-auto rounded-theme-shell border border-theme bg-theme-elevated shadow-theme-lg'
    : 'absolute right-0 top-full z-50 mt-1.5 w-60 rounded-theme-shell border border-theme bg-theme-elevated shadow-theme-lg';

  return (
    <nav className="sticky top-0 z-40 border-b border-theme bg-theme-elevated/95 backdrop-blur">
      <div className={navRowClassName}>
        <div className="flex items-center">
          <button
            type="button"
            onClick={onHomeClick}
            className={homeButtonClassName}
            aria-label="Go to trips home"
            title="Back to trips"
          >
            <TripPlannerLogo variant="mark" decorative className={homeIconClassName} />
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
                  className={titleButtonClassName}
                  title="Click to edit"
                >
                  {tripName || 'Untitled Trip'}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div className={rightSideClassName}>
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
                compact={compact}
              />

              {collaborationOpen ? (
                <div className={collaboratorMenuClassName}>
                  <MenuPointer rightClassName="right-[29px]" hidden={compact} />
                  <div className={compact ? 'border-b border-theme-subtle px-3 py-2.5' : 'border-b border-theme-subtle px-4 py-3'}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                      Collaboration
                    </p>
                    <p className="text-sm font-semibold text-theme">
                      {participantCountLabel ?? 'Workspace'}
                    </p>
                  </div>

                  {activeCollaborators.length > 0 ? (
                    <div className={compact ? 'space-y-2 px-3 py-2.5' : 'space-y-2 px-4 py-3'}>
                      {activeCollaborators.map((collaborator) => (
                        <div
                          key={collaborator.userId}
                          className={compact ? 'flex items-center gap-2.5 rounded-theme-control bg-theme px-2.5 py-2' : 'flex items-center gap-3 rounded-theme-control bg-theme px-3 py-2'}
                        >
                          <span
                            className="rounded-full p-[1px]"
                            style={{ backgroundColor: collaborator.color }}
                          >
                            <img
                              src={collaborator.picture}
                              alt={collaborator.name}
                              className={compact ? 'h-7 w-7 rounded-full' : 'h-8 w-8 rounded-full'}
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
                    <div className={compact ? 'border-t border-theme-subtle px-3 py-2.5' : 'border-t border-theme-subtle px-4 py-3'}>
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
                className={`group flex items-center rounded-theme-control transition-colors ${
                  profileMenuOpen ? 'bg-theme-subtle shadow-theme-sm' : 'bg-theme hover:bg-theme-subtle'
                } ${compact ? 'px-1.5 py-0' : 'gap-1 px-1.5 py-1'}`}
                aria-expanded={profileMenuOpen}
                aria-label={`Open profile menu for ${user.name}`}
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  className={compact ? 'mx-0.5 h-5.5 w-5.5 rounded-full' : 'h-8 w-8 rounded-full'}
                  referrerPolicy="no-referrer"
                />
                <ChevronDown
                  className={`${compact ? 'hidden' : 'h-3.5 w-3.5'} text-theme-tertiary transition-transform ${
                    profileMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileMenuOpen ? (
                <div className={profileMenuClassName}>
                  <MenuPointer rightClassName="right-[29px]" hidden={compact} />
                  <div className={compact ? 'flex items-center gap-3 border-b border-theme-subtle px-3 py-3' : 'flex items-center gap-3 border-b border-theme-subtle px-4 py-4'}>
                    <img
                      src={user.picture}
                      alt={user.name}
                      className={compact ? 'h-10 w-10 rounded-full' : 'h-11 w-11 rounded-full'}
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-theme">{user.name}</p>
                      <p className="text-xs text-theme-tertiary">Workspace settings</p>
                    </div>
                  </div>

                  {shareControl ? (
                    <div className={`${compact ? 'border-b border-theme-subtle px-3 py-2.5' : 'border-b border-theme-subtle px-4 py-3'} [&>*]:w-full [&>*]:justify-start`}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                        Workspace
                      </p>
                      {shareControl}
                    </div>
                  ) : null}

                  {dataTransferControl ? (
                    <div className={compact ? 'border-b border-theme-subtle px-3 py-2.5' : 'border-b border-theme-subtle px-4 py-3'}>
                      {dataTransferControl}
                    </div>
                  ) : null}

                  {showThemeControls ? (
                    <div className={compact ? 'border-b border-theme-subtle px-3 py-2.5' : 'border-b border-theme-subtle px-4 py-3'}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
                        Appearance
                      </p>
                      <div className="grid grid-cols-3 gap-1 rounded-theme-control bg-theme p-1">
                        {THEME_OPTIONS.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              onThemeChange?.(value);
                              setProfileMenuOpen(false);
                            }}
                            aria-label={`${label} theme`}
                            className={`flex flex-col items-center gap-1 rounded-theme-surface px-2 py-2 text-[11px] font-semibold transition-colors ${
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
                    className={compact ? 'flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-red-500' : 'flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-red-500'}
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
    </nav>
  );
}
