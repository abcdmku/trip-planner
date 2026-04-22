import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AppShell, type AppShellProps } from './AppShell';
import { StatusMessage } from '@/component-lib/sync/StatusMessage';
import { FollowModeBanner } from '@/component-lib/presence/FollowModeBanner';
import { mobileStoryGlobals } from '@/storybook/viewports';

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
  <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(160deg,#edf5ef_0%,#e3efe8_44%,#d7e6de_100%)] dark:bg-[linear-gradient(160deg,#0f1715_0%,#12201b_44%,#183029_100%)]">
    <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:52px_52px]" />
    <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
    <div className="absolute right-[-8%] top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

    <svg
      className="absolute inset-0 h-full w-full opacity-80"
      viewBox="0 0 900 700"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M78 472 C180 430 228 324 322 308 C446 286 516 362 602 350 C694 336 760 258 820 190"
        fill="none"
        stroke="rgba(245,158,11,0.8)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M86 468 C194 424 238 318 332 302 C456 280 530 362 612 344 C706 324 778 256 834 182"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="10 12"
      />
      {[
        { cx: 112, cy: 454 },
        { cx: 304, cy: 314 },
        { cx: 516, cy: 354 },
        { cx: 788, cy: 238 },
      ].map((pin) => (
        <g key={`${pin.cx}-${pin.cy}`}>
          <circle cx={pin.cx} cy={pin.cy} r="16" fill="rgba(15,23,42,0.14)" />
          <circle cx={pin.cx} cy={pin.cy} r="12" fill="#ffffff" />
          <circle cx={pin.cx} cy={pin.cy} r="7" fill="#f59e0b" />
        </g>
      ))}
    </svg>

    <div className="absolute left-4 top-4 max-w-[220px] rounded-[28px] border border-white/60 bg-theme/88 px-4 py-3 shadow-theme-lg backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-theme-tertiary">
        Live Map
      </p>
      <p className="mt-1 text-sm font-semibold text-theme">Downtown planning canvas</p>
      <p className="mt-1 text-xs text-theme-secondary">Museum Campus to Wicker Park via the river corridor.</p>
    </div>

    <div className="absolute right-4 top-4 rounded-full border border-white/60 bg-theme/88 px-3 py-1.5 text-xs font-medium text-theme-secondary shadow-theme-sm backdrop-blur">
      12 pins
    </div>

    {[
      {
        label: 'Morning cluster',
        detail: 'Museum Campus',
        className: 'left-[10%] top-[34%]',
      },
      {
        label: 'River route',
        detail: 'Riverwalk leg',
        className: 'left-[42%] top-[24%]',
      },
      {
        label: 'Evening handoff',
        detail: 'Wicker Park shortlist',
        className: 'left-[65%] top-[48%]',
      },
    ].map((callout) => (
      <div
        key={callout.label}
        className={`absolute ${callout.className} rounded-2xl border border-white/70 bg-white/72 px-3 py-2 shadow-theme-sm backdrop-blur dark:border-white/10 dark:bg-black/28`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary">
          {callout.label}
        </p>
        <p className="mt-1 text-sm font-semibold text-theme">{callout.detail}</p>
      </div>
    ))}

    <div className="absolute bottom-6 left-4 right-4 rounded-[28px] border border-white/60 bg-theme/92 p-4 shadow-theme-lg backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-tertiary">
            Active route
          </p>
          <p className="mt-1 text-sm font-semibold text-theme">Lakefront route</p>
          <p className="text-xs text-theme-secondary">18 min walk between the afternoon anchors.</p>
        </div>
        <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold text-accent">
          Ready to review
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {['Museum Campus', 'Riverwalk', 'West Loop transfer', 'Wicker Park'].map((stop) => (
          <span
            key={stop}
            className="rounded-full border border-theme-subtle bg-theme px-2.5 py-1 text-xs font-medium text-theme-secondary"
          >
            {stop}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const participantStrip = (
  <div className="flex items-center gap-2">
    <button
      type="button"
      className="rounded-full border border-theme px-3 py-1.5 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
    >
      Follow teammate
    </button>
    <button
      type="button"
      className="rounded-full border border-theme px-3 py-1.5 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
    >
      Jump to selection
    </button>
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
  <FollowModeBanner name="Maya Patel" contextLabel="Map" onExit={fn()} />
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
  onHomeClick: fn(),
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
    onHomeClick: { control: false },
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
      <FollowModeBanner name="Nora Kim" contextLabel="Timeline" onExit={fn()} />
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
    followStatus: <FollowModeBanner name="Nora Kim" contextLabel="Timeline" onExit={fn()} />,
  },
  render: (args) => renderShell(args, 'max-w-[960px]'),
};

export const MobileStress = {
  args: {
    activeTab: 'map',
    syncStatus: 'offline',
    participantStrip: undefined,
    followStatus: undefined,
    topBanner,
    workspaceOverlay: undefined,
  },
  globals: mobileStoryGlobals,
  render: (args: AppShellProps) => renderShell(args),
} as Story;
