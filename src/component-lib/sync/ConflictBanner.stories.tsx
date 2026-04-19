import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ConflictBanner, type ConflictBannerProps } from './ConflictBanner';

const onReloadSpy = fn();
const onDismissSpy = fn();

const meta = {
  title: 'Component Lib/Sync/ConflictBanner',
  component: ConflictBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline warning shown when local edits conflict with a newer sheet snapshot. Stories cover the alert copy and the reload/dismiss actions.',
      },
    },
  },
  args: {
    message: 'Remote edits were detected. Reload to reconcile with the latest trip data.',
    onReload: onReloadSpy,
    onDismiss: onDismissSpy,
  },
} satisfies Meta<typeof ConflictBanner>;

export default meta;

type Story = StoryObj<ConflictBannerProps>;

export const Default: Story = {};

export const AlertActions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reload/i }));
    await userEvent.click(canvas.getByRole('button', { name: /dismiss/i }));
    await expect(onReloadSpy).toHaveBeenCalledTimes(1);
    await expect(onDismissSpy).toHaveBeenCalledTimes(1);
  },
};

export const MessageOnly: Story = {
  render: () => (
    <div className="min-h-[160px] bg-theme p-6">
      <ConflictBanner message="Remote edits were detected. Reload to reconcile with the latest trip data." />
    </div>
  ),
};
