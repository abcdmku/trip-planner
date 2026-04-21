import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AppShell, type AppShellProps } from './AppShell';
import { StatusMessage } from '@/component-lib/sync/StatusMessage';

function avatarDataUri(label: string, background: string): string {
  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="${background}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="white">${initials}</text>
    </svg>`,
  )}`;
}

const collaborators = [
  {
    userId: 'maya',
    name: 'Maya Patel',
    picture: avatarDataUri('Maya Patel', '#2563EB'),
    color: '#2563EB',
  },
  {
    userId: 'nora',
    name: 'Nora Kim',
    picture: avatarDataUri('Nora Kim', '#DB2777'),
    color: '#DB2777',
  },
  {
    userId: 'sam',
    name: 'Sam Ortega',
    picture: avatarDataUri('Sam Ortega', '#059669'),
    color: '#059669',
  },
];

const user = {
  name: 'Avery Stone',
  picture: avatarDataUri('Avery Stone', '#7C3AED'),
};

const dayTabs = (
  <div className="border-b border-theme bg-theme-elevated px-3 py-2">
    <div className="flex flex-wrap gap-2">
      {[
        { label: 'May 12', active: true },
        { label: 'May 13', active: false },
        { label: 'May 14', active: false },
      ].map((day) => (
        <button
          key={day.label}
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            day.active
              ? 'border-accent bg-accent text-white'
              : 'border-theme text-theme-secondary hover:bg-theme-subtle hover:text-theme'
          }`}
        >
          {day.label}
        </button>
      ))}
    </div>
  </div>
);

const itinerary = (
  <div className="space-y-3 p-4">
    {[
      {
        title: 'Coffee at Sawada',
        time: '08:30',
        meta: '15 min stop',
      },
      {
        title: 'Architecture boat tour',
        time: '10:00',
        meta: 'Booked • 90 min',
      },
      {
        title: 'Lunch in Fulton Market',
        time: '12:30',
        meta: 'Shared shortlist',
      },
      {
        title: 'Blue line to Wicker Park',
        time: '15:00',
        meta: 'Transit hold',
      },
    ].map((item) => (
      <article
        key={item.title}
        className="rounded-2xl border border-theme bg-theme px-4 py-3 shadow-theme-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-theme">{item.title}</p>
            <p className="text-xs text-theme-secondary">{item.meta}</p>
          </div>
          <span className="rounded-full bg-theme-subtle px-2 py-1 text-xs font-medium text-theme-secondary">
            {item.time}
          </span>
        </div>
      </article>
    ))}
  </div>
);

const extendedItinerary = (
  <div className="space-y-3 p-4">
    {[
      'Hotel breakfast',
      'Green Mill reservation',
      'Lincoln Park conservatory',
      'Museum Campus walk',
      'River North dinner',
      'Late-night skyline stop',
    ].map((title, index) => (
      <article
        key={title}
        className="rounded-2xl border border-theme bg-theme px-4 py-3 shadow-theme-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-theme">{title}</p>
            <p className="text-xs text-theme-secondary">
              Day {Math.min(index + 1, 4)} planning block
            </p>
          </div>
          <span className="rounded-full bg-theme-subtle px-2 py-1 text-xs font-medium text-theme-secondary">
            {`${8 + index}:00`}
          </span>
        </div>
      </article>
    ))}
  </div>
);

const timeline = (
  <div className="flex h-full min-w-0 gap-3 overflow-x-auto p-3">
    {['Day 1', 'Day 2'].map((day, dayIndex) => (
      <section
        key={day}
        className="flex min-w-[220px] flex-1 flex-col rounded-2xl border border-theme bg-theme px-3 py-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-theme">{day}</h3>
          <span className="text-xs text-theme-secondary">{dayIndex === 0 ? 'Packed' : 'Open'}</span>
        </div>
        <div className="space-y-2">
          {['09:00', '11:00', '15:30'].map((time, blockIndex) => (
            <div
              key={`${day}-${time}`}
              className={`rounded-xl px-3 py-3 text-sm ${
                blockIndex === 1
                  ? 'bg-accent/10 text-theme'
                  : 'bg-theme-subtle text-theme-secondary'
              }`}
            >
              <p className="font-medium">{time}</p>
              <p className="text-xs opacity-80">
                {blockIndex === 1 ? 'Transit + reservation hold' : 'Open planning slot'}
              </p>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const multiDayTimeline = (
  <div className="flex h-full min-w-0 gap-3 overflow-x-auto p-3">
    {['Day 1', 'Day 2', 'Day 3', 'Day 4'].map((day, index) => (
      <section
        key={day}
        className="flex w-[220px] flex-shrink-0 flex-col rounded-2xl border border-theme bg-theme px-3 py-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-theme">{day}</h3>
          <span className="text-xs text-theme-secondary">{index + 2} stops</span>
        </div>
        <div className="space-y-2">
          {['Morning', 'Midday', 'Evening'].map((period) => (
            <div
              key={`${day}-${period}`}
              className="rounded-xl bg-theme-subtle px-3 py-3 text-sm text-theme-secondary"
            >
              <p className="font-medium text-theme">{period}</p>
              <p className="text-xs opacity-80">Room for additions</p>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const map = (
  <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.35),_transparent_35%),linear-gradient(135deg,_rgba(249,250,251,1),_rgba(229,231,235,1))] p-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_35%),linear-gradient(135deg,_rgba(23,23,23,1),_rgba(38,38,38,1))]">
    <div className="flex items-start justify-between gap-4">
      <div className="rounded-2xl border border-theme bg-theme/90 px-4 py-3 shadow-theme-lg backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-tertiary">
          Live map
        </p>
        <p className="text-sm font-semibold text-theme">Downtown planning canvas</p>
      </div>
      <div className="rounded-full border border-theme bg-theme/90 px-3 py-1.5 text-xs font-medium text-theme-secondary shadow-theme-sm backdrop-blur">
        12 pins
      </div>
    </div>
    <div className="grid flex-1 grid-cols-3 gap-3 px-8 py-6">
      {['Morning cluster', 'River route', 'Evening handoff'].map((label, index) => (
        <div
          key={label}
          className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-theme-sm backdrop-blur dark:border-white/10 dark:bg-black/20"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-theme-tertiary">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-theme">
            {index === 0
              ? 'Museum Campus'
              : index === 1
                ? 'Riverwalk leg'
                : 'Wicker Park shortlist'}
          </p>
        </div>
      ))}
    </div>
    <div className="flex justify-end">
      <div className="rounded-2xl border border-theme bg-theme/90 px-4 py-3 shadow-theme-lg backdrop-blur">
        <p className="text-sm font-semibold text-theme">Lakefront route</p>
        <p className="text-xs text-theme-secondary">18 min walking between afternoon stops</p>
      </div>
    </div>
  </div>
);

const participantStrip = (
  <div className="hidden items-center gap-1 rounded-full border border-theme bg-theme px-2 py-1 md:flex">
    {collaborators.slice(0, 2).map((collaborator) => (
      <img
        key={collaborator.userId}
        src={collaborator.picture}
        alt={collaborator.name}
        className="h-5 w-5 rounded-full border border-white"
      />
    ))}
    <span className="pl-1 text-xs font-medium text-theme-secondary">3 live</span>
  </div>
);

const shareControl = (
  <button
    type="button"
    className="rounded-full border border-theme px-3 py-1.5 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
  >
    Share
  </button>
);

const followStatus = (
  <div className="hidden md:block">
    <StatusMessage label="Following Maya on map" tone="info" variant="badge" />
  </div>
);

const topBanner = (
  <StatusMessage
    label="Draft itinerary synced for review"
    detail="Route-lib can swap this slot for trip warnings or collaboration notices."
    tone="warning"
    variant="banner"
  />
);

const workspaceOverlay = (
  <div className="pointer-events-none absolute bottom-4 left-4 z-40 rounded-2xl border border-theme bg-theme/90 px-3 py-2 text-xs text-theme-secondary shadow-theme-lg backdrop-blur">
    2 collaborators editing the itinerary
  </div>
);

function renderShell(args: AppShellProps, widthClass = 'w-full') {
  return (
    <div className="bg-theme">
      <div className={`mx-auto h-screen ${widthClass}`}>
        <AppShell {...args} />
      </div>
    </div>
  );
}

const baseArgs = {
  activeTab: 'map',
  onActiveTabChange: fn(),
  dayTabs,
  itinerary,
  timeline,
  map,
  timelineDayCount: 2,
  tripName: 'Chicago Planning Sprint',
  onTripNameChange: fn(),
  syncStatus: 'synced',
  user,
  onLogout: fn(),
  participantStrip,
  shareControl,
  activeCollaborators: collaborators,
  followStatus,
  desktopLayoutMode: 'split',
  onDesktopLayoutModeChange: fn(),
  desktopLeftPanelWidth: 760,
  onDesktopLeftPanelWidthChange: fn(),
  onItineraryScroll: fn(),
  theme: 'light',
  onThemeChange: fn(),
} satisfies AppShellProps;

const meta = {
  title: 'Component Lib/Layout/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Controlled workspace chrome for the app shell. Route-lib should supply the view content, collaboration status, and layout state through props rather than embedding runtime hooks here.',
      },
    },
  },
  argTypes: {
    dayTabs: { control: false },
    itinerary: { control: false },
    timeline: { control: false },
    map: { control: false },
    participantStrip: { control: false },
    shareControl: { control: false },
    followStatus: { control: false },
    workspaceOverlay: { control: false },
    topBanner: { control: false },
    workspaceRef: { control: false },
    onActiveTabChange: { control: false },
    onTripNameChange: { control: false },
    onLogout: { control: false },
    onDesktopLayoutModeChange: { control: false },
    onDesktopLeftPanelWidthChange: { control: false },
    onItineraryScroll: { control: false },
    onThemeChange: { control: false },
  },
  args: baseArgs,
  render: (args) => renderShell(args),
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<AppShellProps>;

export const Default: Story = {};

export const TabbedWorkspace: Story = {
  args: {
    activeTab: 'timeline',
    desktopLayoutMode: 'tabbed',
    onActiveTabChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /map/i }));

    await expect(args.onActiveTabChange).toHaveBeenCalledWith('map');
  },
};

export const CollaborativeOverlay: Story = {
  args: {
    syncStatus: 'syncing',
    topBanner,
    workspaceOverlay,
    followStatus: (
      <div className="hidden rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-theme md:block">
        Following Nora on timeline
      </div>
    ),
  },
  render: (args) => renderShell(args, 'max-w-[1180px]'),
};

export const MultiDaySplit: Story = {
  args: {
    itinerary: extendedItinerary,
    timeline: multiDayTimeline,
    timelineDayCount: 4,
    desktopLeftPanelWidth: 980,
  },
};

export const ConstrainedDesktopStress: Story = {
  args: {
    tripName: 'Lake Michigan Architecture Weekend Sprint With Collaborators',
    syncStatus: 'error',
    topBanner,
    workspaceOverlay,
    followStatus: (
      <div className="hidden md:block">
        <StatusMessage
          label="Following Nora on timeline"
          detail="Review mode"
          tone="info"
          variant="badge"
        />
      </div>
    ),
  },
  render: (args) => renderShell(args, 'max-w-[960px]'),
};

export const MobileStress: Story = {
  args: {
    activeTab: 'map',
    syncStatus: 'offline',
    participantStrip: undefined,
    followStatus: undefined,
    topBanner,
    workspaceOverlay: undefined,
  },
  render: (args) => renderShell(args, 'w-[430px]'),
};
