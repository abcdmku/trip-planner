import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TripWorkspaceScreen } from './TripWorkspaceScreen';

const baseReadyArgs = {
  status: 'ready' as const,
  appShellProps: {
    activeTab: 'map' as const,
    onActiveTabChange: fn(),
    tripName: 'Chicago Sprint',
    timelineDayCount: 3,
    syncStatus: 'synced' as const,
    user: {
      name: 'Storybook User',
      picture:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80',
    },
    onLogout: fn(),
    participantStrip: (
      <div className="rounded-xl border border-theme bg-theme-elevated px-3 py-2 text-sm text-theme">
        Participant strip
      </div>
    ),
    shareControl: (
      <button className="rounded-lg border border-theme px-3 py-2 text-sm text-theme">
        Share trip
      </button>
    ),
    activeCollaborators: [
      {
        userId: 'collab-1',
        name: 'Alex Rivera',
        picture:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&q=80',
        color: '#0ea5e9',
      },
    ],
    followStatus: null,
    workspaceOverlay: (
      <div className="pointer-events-none absolute inset-0 border border-dashed border-sky-500/40" />
    ),
    topBanner: (
      <div className="rounded-xl border border-theme bg-theme-elevated px-4 py-3 text-sm text-theme">
        Remote edit notice
      </div>
    ),
    desktopLayoutMode: 'split' as const,
    onDesktopLayoutModeChange: fn(),
    desktopLeftPanelWidth: 720,
    onDesktopLeftPanelWidthChange: fn(),
    itineraryScrollTop: 24,
    onItineraryScroll: fn(),
    theme: 'light' as const,
    onThemeChange: fn(),
    dayTabs: (
      <div className="rounded-2xl border border-theme bg-theme-elevated px-4 py-3 text-sm text-theme">
        Day tabs
      </div>
    ),
    itinerary: (
      <div className="h-full rounded-2xl border border-theme bg-theme-elevated p-4 text-sm text-theme">
        Itinerary list
      </div>
    ),
    timeline: (
      <div className="h-full rounded-2xl border border-theme bg-theme-elevated p-4 text-sm text-theme">
        Timeline surface
      </div>
    ),
    map: (
      <div className="h-full rounded-2xl border border-theme bg-[linear-gradient(135deg,#dbeafe,#bfdbfe)] p-4 text-sm text-slate-900">
        Map surface
      </div>
    ),
  },
  dayEditorProps: {
    isOpen: false,
    onClose: fn(),
    onSave: fn(),
  },
  deleteDayDialogProps: {
    isOpen: false,
    dayLabel: '',
    eventCount: 0,
    onCancel: fn(),
    onConfirm: fn(),
  },
  addItemDialogProps: {
    isOpen: false,
    onClose: fn(),
    onAdd: fn(),
  },
  itemEditorDialogProps: {
    isOpen: false,
    item: null,
    onClose: fn(),
  },
  legInfoPopupProps: null,
  dragOverlayProps: {
    item: null,
    isOverTimeline: false,
  },
};

const meta = {
  title: 'Route Lib/Trip Workspace/TripWorkspaceScreen',
  component: TripWorkspaceScreen,
  tags: ['autodocs'],
  args: baseReadyArgs,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TripWorkspaceScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const FollowingCollaborator: Story = {
  args: {
    ...baseReadyArgs,
    appShellProps: {
      ...baseReadyArgs.appShellProps,
      followStatus: (
        <div className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-medium text-white">
          Following Jordan
        </div>
      ),
      activeTab: 'timeline',
    },
  },
};

export const Loading: Story = {
  args: {
    status: 'loading',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    title: 'Unable to Load Trip',
    message: 'Storybook error state for the workspace route.',
    onBackToTrips: fn(),
  },
};
