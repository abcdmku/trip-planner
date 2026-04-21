import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ConflictBanner, type ConflictBannerProps } from './ConflictBanner';

const onReloadSpy = fn();
const onDismissSpy = fn();

function renderBanner(args: ConflictBannerProps, widthClass = 'max-w-[760px]') {
  return (
    <div className="min-h-[200px] bg-theme p-6">
      <div className={widthClass}>
        <ConflictBanner {...args} />
      </div>
    </div>
  );
}

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
  render: (args) => renderBanner(args),
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
  render: () =>
    renderBanner(
      {
        message: 'Remote edits were detected. Reload to reconcile with the latest trip data.',
      },
      'max-w-[420px]',
    ),
};
