import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Compass, RefreshCw, Check, AlertTriangle, LogOut, ChevronDown, Sun, Moon, Monitor, WifiOff } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface NavbarProps {
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  user?: { name: string; picture: string };
  onLogout?: () => void | Promise<void>;
  shareControl?: ReactNode;
  activeCollaborators?: Array<{ userId: string; name: string; picture: string; color: string }>;
}

function SyncBadge({ status }: { status: 'synced' | 'syncing' | 'error' | 'offline' }) {
  if (status === 'syncing') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-theme-secondary">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline">Syncing</span>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <AlertTriangle className="h-3 w-3" />
        <span className="hidden sm:inline">Error</span>
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-500">
        <WifiOff className="h-3 w-3" />
        <span className="hidden sm:inline">Offline</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <Check className="h-3 w-3" />
      <span className="hidden sm:inline">Saved</span>
    </span>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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
  };

  const Icon = icons[theme];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost rounded-lg p-2"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 animate-in rounded-lg border border-theme bg-theme-elevated py-1 shadow-theme-lg">
          {(['light', 'dark', 'system'] as const).map((t) => {
            const TIcon = icons[t];
            return (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm capitalize transition-colors ${
                  theme === t
                    ? 'bg-theme-subtle text-theme'
                    : 'text-theme-secondary hover:bg-theme-subtle hover:text-theme'
                }`}
              >
                <TIcon className="h-4 w-4" />
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Navbar({
  tripName,
  onTripNameChange,
  syncStatus = 'synced',
  user,
  onLogout,
  shareControl,
  activeCollaborators = [],
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
    setEditValue(tripName ?? '');
  }, [tripName]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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
    <nav className="sticky top-0 z-40 flex h-14 items-center border-b border-theme bg-theme-elevated px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Compass className="h-4 w-4 text-white dark:text-neutral-900" />
        </div>
        <span className="hidden text-sm font-semibold text-theme sm:block">
          Trip Planner
        </span>
      </div>

      {/* Center - Trip name */}
      <div className="mx-4 flex flex-1 items-center justify-center gap-2">
        {tripName !== undefined && (
          <>
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') {
                    setEditValue(tripName);
                    setIsEditing(false);
                  }
                }}
                className="input max-w-[200px] text-center text-sm font-medium"
                aria-label="Edit trip name"
              />
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="max-w-[200px] truncate rounded-lg px-2 py-1 text-sm font-medium text-theme transition-colors hover:bg-theme-subtle"
                title="Click to edit"
              >
                {tripName || 'Untitled Trip'}
              </button>
            )}
            <SyncBadge status={syncStatus} />
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {activeCollaborators.length > 0 && (
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
        )}

        {shareControl}
        <ThemeToggle />

        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-theme-subtle"
              aria-expanded={dropdownOpen}
            >
              <img
                src={user.picture}
                alt={user.name}
                className="h-7 w-7 rounded-full"
                referrerPolicy="no-referrer"
              />
              <ChevronDown className="hidden h-3 w-3 text-theme-tertiary sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 animate-in rounded-lg border border-theme bg-theme-elevated py-1 shadow-theme-lg">
                <div className="border-b border-theme-subtle px-3 py-2">
                  <p className="truncate text-sm font-medium text-theme">{user.name}</p>
                </div>
                <button
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
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
