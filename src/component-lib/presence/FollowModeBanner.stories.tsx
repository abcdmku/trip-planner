import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FollowModeBanner, type FollowModeBannerProps } from './FollowModeBanner';

const onExitSpy = fn();

const meta = {
  title: 'Component Lib/Presence/FollowModeBanner',
  component: FollowModeBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact collaborative status pill shown when the local view follows another participant. Stories cover the default banner and the exit action.',
      },
    },
  },
  args: {
    name: 'Maya Patel',
    onExit: onExitSpy,
  },
  render: (args) => (
    <div className="min-h-[240px] bg-theme p-6 text-theme">
      <FollowModeBanner {...args} />
    </div>
  ),
} satisfies Meta<typeof FollowModeBanner>;

export default meta;

type Story = StoryObj<FollowModeBannerProps>;

export const Default: Story = {};

export const ExitAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /stop/i }));
    await expect(onExitSpy).toHaveBeenCalledTimes(1);
  },
};
