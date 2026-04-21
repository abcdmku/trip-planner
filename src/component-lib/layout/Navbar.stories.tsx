import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Navbar, type NavbarProps } from './Navbar';
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
    <StatusMessage label="Following Maya" tone="info" variant="badge" />
  </div>
);

function renderNavbar(args: NavbarProps, widthClass = 'w-full') {
  return (
    <div className="min-h-screen bg-theme p-4">
      <div className={`${widthClass} overflow-hidden rounded-2xl border border-theme shadow-theme-lg`}>
        <Navbar {...args} />
      </div>
    </div>
  );
}

const baseArgs = {
  tripName: 'Pacific Coast Sprint',
  onTripNameChange: fn(),
  syncStatus: 'synced',
  user,
  onLogout: fn(),
  participantStrip,
  shareControl,
  activeCollaborators: collaborators,
  followStatus,
  theme: 'system',
  onThemeChange: fn(),
} satisfies NavbarProps;

const meta = {
  title: 'Component Lib/Layout/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Presentational top chrome for trip workspaces. Route-lib adapters are expected to provide share controls, collaboration summaries, and persistence state as explicit props.',
      },
    },
  },
  argTypes: {
    participantStrip: { control: false },
    shareControl: { control: false },
    followStatus: { control: false },
    onTripNameChange: { control: false },
    onLogout: { control: false },
    onThemeChange: { control: false },
  },
  args: baseArgs,
  render: (args) => renderNavbar(args),
} satisfies Meta<typeof Navbar>;

export default meta;

type Story = StoryObj<NavbarProps>;

export const Default: Story = {};

export const SyncingCollaborative: Story = {
  args: {
    syncStatus: 'syncing',
  },
};

export const OfflineMinimal: Story = {
  args: {
    syncStatus: 'offline',
    participantStrip: undefined,
    shareControl: undefined,
    followStatus: undefined,
    activeCollaborators: [],
  },
};

export const HeaderStress: Story = {
  args: {
    tripName: 'Lake Michigan Architecture Weekend Sprint With Collaborators',
    syncStatus: 'error',
    activeCollaborators: [
      ...collaborators,
      {
        userId: 'liam',
        name: 'Liam Brooks',
        picture: avatarDataUri('Liam Brooks', '#F97316'),
        color: '#F97316',
      },
      {
        userId: 'zoe',
        name: 'Zoe Carter',
        picture: avatarDataUri('Zoe Carter', '#14B8A6'),
        color: '#14B8A6',
      },
    ],
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
    shareControl: (
      <button
        type="button"
        className="rounded-full border border-theme px-3 py-1.5 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
      >
        Share Workspace
      </button>
    ),
  },
  render: (args) => renderNavbar(args, 'max-w-[860px]'),
};

export const MobileStress: Story = {
  args: {
    tripName: 'Chicago Sprint Planning',
    syncStatus: 'offline',
    participantStrip: undefined,
    followStatus: undefined,
  },
  render: (args) => renderNavbar(args, 'w-[430px]'),
};

export const NoTripContext: Story = {
  args: {
    tripName: undefined,
    participantStrip: undefined,
    shareControl: undefined,
    followStatus: undefined,
    activeCollaborators: [],
    user: undefined,
  },
};

export const UserMenu: Story = {
  args: {
    onLogout: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /avery stone/i }));
    await userEvent.click(canvas.getByRole('button', { name: /sign out/i }));

    await expect(args.onLogout).toHaveBeenCalledTimes(1);
  },
};

export const ThemeSelection: Story = {
  args: {
    theme: 'light',
    onThemeChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /toggle theme/i }));
    await userEvent.click(canvas.getByRole('button', { name: /dark/i }));

    await expect(args.onThemeChange).toHaveBeenCalledWith('dark');
  },
};
