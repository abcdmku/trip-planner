import type { LucideIcon } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import type { PresenceWorkspaceLayout } from '@/types/collaboration';

export type AppShellTab = 'map' | 'itinerary' | 'timeline' | 'optimize' | (string & {});
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface LayoutUser {
  name: string;
  picture: string;
}

export interface ActiveCollaborator {
  userId: string;
  name: string;
  picture: string;
  color: string;
}

export interface MobileTabDefinition {
  id: AppShellTab;
  label: string;
  icon: LucideIcon;
}

export interface MobileTabsProps {
  activeTab: AppShellTab;
  onTabChange: (tab: AppShellTab) => void;
  tabs?: readonly MobileTabDefinition[];
}

export interface NavbarProps {
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: SyncStatus;
  user?: LayoutUser;
  onLogout?: () => void | Promise<void>;
  onHomeClick?: () => void;
  participantStrip?: ReactNode;
  shareControl?: ReactNode;
  activeCollaborators?: ActiveCollaborator[];
  followStatus?: ReactNode;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

export interface AppShellProps {
  activeTab: AppShellTab;
  onActiveTabChange?: (tab: AppShellTab) => void;
  dayTabs?: ReactNode;
  itinerary?: ReactNode;
  timeline?: ReactNode;
  map?: ReactNode;
  timelineDayCount?: number;
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: SyncStatus;
  user?: LayoutUser;
  onLogout?: () => void | Promise<void>;
  onHomeClick?: () => void;
  participantStrip?: ReactNode;
  shareControl?: ReactNode;
  activeCollaborators?: ActiveCollaborator[];
  followStatus?: ReactNode;
  workspaceOverlay?: ReactNode;
  topBanner?: ReactNode;
  desktopLayoutMode?: PresenceWorkspaceLayout;
  onDesktopLayoutModeChange?: (mode: PresenceWorkspaceLayout) => void;
  desktopLeftPanelWidth?: number;
  onDesktopLeftPanelWidthChange?: (width: number) => void;
  itineraryScrollTop?: number;
  onItineraryScroll?: (scrollTop: number) => void;
  workspaceRef?: Ref<HTMLDivElement>;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}
