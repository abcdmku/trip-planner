import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Compass,
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
  participantStrip?: ReactNode;
  shareControl?: ReactNode;
  activeCollaborators?: Array<{ userId: string; name: string; picture: string; color: string }>;
  followStatus?: ReactNode;
  theme?: NavbarTheme;
  onThemeChange?: (theme: NavbarTheme) => void;
}

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

function ThemeToggle({
  theme = 'system',
  onThemeChange,
}: {
  theme?: NavbarTheme;
  onThemeChange?: (theme: NavbarTheme) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  } satisfies Record<NavbarTheme, typeof Sun>;

  const Icon = icons[theme];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="btn-ghost rounded-lg p-2"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 w-36 animate-in rounded-lg border border-theme bg-theme-elevated py-1 shadow-theme-lg">
          {(['light', 'dark', 'system'] as const).map((nextTheme) => {
            const ThemeIcon = icons[nextTheme];
            return (
              <button
                key={nextTheme}
                type="button"
                onClick={() => {
                  onThemeChange?.(nextTheme);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm capitalize transition-colors ${
                  theme === nextTheme
                    ? 'bg-theme-subtle text-theme'
                    : 'text-theme-secondary hover:bg-theme-subtle hover:text-theme'
                }`}
              >
                <ThemeIcon className="h-4 w-4" />
                {nextTheme}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Navbar({
  tripName,
  onTripNameChange,
  syncStatus = 'synced',
  user,
  onLogout,
  participantStrip,
  shareControl,
  activeCollaborators = [],
  followStatus,
  theme,
  onThemeChange,
}: NavbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tripName ?? '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setEditValue(tripName ?? '');
  }, [isEditing, tripName]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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

  return (
    <nav className="sticky top-0 z-40 border-b border-theme bg-theme-elevated">
      <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-theme bg-theme shadow-theme-sm">
            <Compass className="h-4 w-4 text-accent" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
              Trip Planner
            </p>
            <p className="text-sm font-semibold text-theme">Workspace</p>
          </div>
        </div>

        <div className="mx-2 flex min-w-0 flex-wrap items-center justify-center gap-2 sm:mx-4">
          {tripName !== undefined ? (
            <>
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
                  className="input max-w-[180px] text-center text-sm font-medium sm:max-w-[220px]"
                  aria-label="Edit trip name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="max-w-[180px] truncate rounded-full border border-transparent px-3 py-1.5 text-sm font-semibold text-theme transition-colors hover:border-theme hover:bg-theme sm:max-w-[280px]"
                  title="Click to edit"
                >
                  {tripName || 'Untitled Trip'}
                </button>
              )}
              <SyncBadge status={syncStatus} />
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
          <div className="hidden min-w-0 items-center gap-1.5 xl:flex">
            {followStatus}
            {participantStrip}
          </div>

          {activeCollaborators.length > 0 ? (
            <div className="flex items-center gap-1 md:hidden">
              {activeCollaborators.slice(0, 3).map((collaborator) => (
                <div
                  key={collaborator.userId}
                  className="rounded-full p-[1px]"
                  style={{ backgroundColor: collaborator.color }}
                  title={collaborator.name}
                >
                  <img
                    src={collaborator.picture}
                    alt={collaborator.name}
                    className="h-6 w-6 rounded-full border border-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {shareControl ? <div className="hidden sm:block">{shareControl}</div> : null}
          <div className="rounded-full border border-theme bg-theme px-0.5 py-0.5 shadow-theme-sm">
            <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
          </div>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((current) => !current)}
                className="flex items-center gap-2 rounded-full border border-theme bg-theme px-2 py-1.5 shadow-theme-sm transition-colors hover:bg-theme-subtle"
                aria-expanded={dropdownOpen}
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-7 w-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-theme lg:block">
                  {user.name}
                </span>
                <ChevronDown className="hidden h-3 w-3 text-theme-tertiary sm:block" />
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 top-full mt-1 w-44 animate-in rounded-lg border border-theme bg-theme-elevated py-1 shadow-theme-lg">
                  <div className="border-b border-theme-subtle px-3 py-2">
                    <p className="truncate text-sm font-medium text-theme">{user.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {(followStatus || participantStrip) ? (
          <div className="col-span-3 hidden min-w-0 items-center gap-2 overflow-hidden border-t border-theme-subtle pt-2 md:flex xl:hidden">
            <div className="min-w-0 flex-1">{followStatus}</div>
            {participantStrip}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
