import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ParticipantStrip, type ParticipantStripProps } from './ParticipantStrip';
import type { CollaborationParticipant } from '@/types/collaboration';

const onFollowSpy = fn();
const onJumpToSpy = fn();
const onStopFollowingSpy = fn();

function avatarDataUri(label: string, color: string): string {
  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="${color}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="white">${initials}</text>
    </svg>`,
  )}`;
}

const participants: CollaborationParticipant[] = [
  {
    connectionId: 'maya',
    tripId: 'trip-1',
    userId: 'user-maya',
    name: 'Maya Patel',
    picture: avatarDataUri('Maya Patel', '#2563EB'),
    color: '#2563EB',
    status: 'active',
    joinedAt: '2026-04-19T15:00:00.000Z',
    lastSeenAt: '2026-04-19T15:01:00.000Z',
    cursor: null,
    itemPreview: null,
    selection: { connectionId: 'maya', tripId: 'trip-1', userId: 'user-maya', objectIds: ['item-12'], primaryObjectId: 'item-12', updatedAt: '2026-04-19T15:01:00.000Z' },
    viewport: null,
    manipulation: null,
  },
  {
    connectionId: 'nora',
    tripId: 'trip-1',
    userId: 'user-nora',
    name: 'Nora Kim',
    picture: avatarDataUri('Nora Kim', '#DB2777'),
    color: '#DB2777',
    status: 'reconnecting',
    joinedAt: '2026-04-19T15:00:30.000Z',
    lastSeenAt: '2026-04-19T15:02:10.000Z',
    cursor: null,
    itemPreview: null,
    selection: null,
    viewport: null,
    manipulation: {
      connectionId: 'nora',
      tripId: 'trip-1',
      userId: 'user-nora',
      objectId: 'leg-4',
      kind: 'move',
      label: 'Moving',
      updatedAt: '2026-04-19T15:02:10.000Z',
    },
  },
  {
    connectionId: 'sam',
    tripId: 'trip-1',
    userId: 'user-sam',
    name: 'Sam Ortega',
    picture: avatarDataUri('Sam Ortega', '#059669'),
    color: '#059669',
    status: 'active',
    joinedAt: '2026-04-19T15:01:10.000Z',
    lastSeenAt: '2026-04-19T15:01:45.000Z',
    cursor: null,
    itemPreview: null,
    selection: null,
    viewport: null,
    manipulation: null,
  },
];

const meta = {
  title: 'Component Lib/Presence/ParticipantStrip',
  component: ParticipantStrip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Collaborator strip with follow and jump actions. Stories include the solo fallback and interactive menu paths to keep the remote-presence behavior reviewable without live networking.',
      },
    },
  },
  args: {
    participants,
    localConnectionId: 'sam',
    followedConnectionId: 'maya',
    onFollow: onFollowSpy,
    onJumpTo: onJumpToSpy,
    onStopFollowing: onStopFollowingSpy,
  },
  render: (args) => (
    <div className="min-h-[320px] bg-theme p-6 text-theme">
      <div className="flex min-h-[220px] w-[1120px] items-start justify-end rounded-3xl border border-theme bg-theme-elevated p-4">
        <ParticipantStrip {...args} />
      </div>
    </div>
  ),
} satisfies Meta<typeof ParticipantStrip>;

export default meta;

type Story = StoryObj<ParticipantStripProps>;

export const Default: Story = {};

export const SoloFallback: Story = {
  args: {
    participants: [participants[2]],
    localConnectionId: 'sam',
    followedConnectionId: null,
  },
};

export const JumpToParticipant: Story = {
  args: {
    followedConnectionId: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /maya patel/i }));
    await userEvent.click(canvas.getByRole('button', { name: /jump to user/i }));
    await expect(onJumpToSpy).toHaveBeenCalledWith('maya');
  },
};

export const StopFollowing: Story = {
  args: {
    followedConnectionId: 'maya',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /maya patel/i }));
    await userEvent.click(canvas.getByRole('button', { name: /stop following/i }));
    await expect(onStopFollowingSpy).toHaveBeenCalledTimes(1);
  },
};
