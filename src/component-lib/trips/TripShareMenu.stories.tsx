import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TripShareMenu } from './TripShareMenu';
import type { TripInvite, TripMember } from '@/types/api';

const members: TripMember[] = [
  {
    memberId: 'member-1',
    tripId: 'trip-1',
    userId: 'user-1',
    name: 'Avery Chen',
    email: 'avery@example.com',
    picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    role: 'owner',
    createdAt: '2026-05-01T12:00:00.000Z',
  },
  {
    memberId: 'member-2',
    tripId: 'trip-1',
    userId: 'user-2',
    name: 'Jordan Lee',
    email: 'jordan@example.com',
    picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    role: 'editor',
    createdAt: '2026-05-01T12:05:00.000Z',
  },
];

const invites: TripInvite[] = [
  {
    inviteId: 'invite-1',
    tripId: 'trip-1',
    email: 'maya@example.com',
    role: 'editor',
    invitedByUserId: 'user-1',
    invitedByName: 'Avery Chen',
    createdAt: '2026-05-02T09:00:00.000Z',
  },
];

const inviteSpy = fn();
const deleteInviteSpy = fn();
const deleteMemberSpy = fn();

const meta = {
  title: 'Component Lib/Trips/TripShareMenu',
  component: TripShareMenu,
  tags: ['autodocs'],
  args: {
    canManage: true,
    members,
    pendingInvites: invites,
    currentUserId: 'user-1',
    onInvite: inviteSpy,
    onDeleteInvite: deleteInviteSpy,
    onDeleteMember: deleteMemberSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TripShareMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const ReadOnly: Story = {
  args: {
    canManage: false,
    pendingInvites: [],
  },
};

export const OpenMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
  },
};

export const InvitesAMember: Story = {
  args: {
    onInvite: inviteSpy,
  },
  play: async ({ canvasElement }) => {
    inviteSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await userEvent.type(canvas.getByPlaceholderText('collaborator@example.com'), 'new@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Invite' }));

    await expect(inviteSpy).toHaveBeenCalledWith({ email: 'new@example.com', role: 'editor' });
  },
};
