import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { RefreshCw } from 'lucide-react';
import { StatusMessage } from './StatusMessage';

const retrySpy = fn();

function storyFrame(widthClass: string, story: ReactNode) {
  return (
    <div className="min-h-[220px] bg-theme p-6">
      <div className={widthClass}>{story}</div>
    </div>
  );
}

const meta = {
  title: 'Component Lib/Sync/StatusMessage',
  component: StatusMessage,
  tags: ['autodocs'],
  args: {
    label: 'Syncing changes',
    detail: 'Just now',
    tone: 'info',
    variant: 'badge',
  },
  render: (args) => storyFrame('max-w-[220px]', <StatusMessage {...(args as any)} />),
} satisfies Meta<typeof StatusMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Badge: Story = {};

export const Inline: Story = {
  args: {
    label: 'All changes saved',
    detail: '2m ago',
    tone: 'success',
    variant: 'inline',
  },
  render: (args) => storyFrame('max-w-[220px]', <StatusMessage {...(args as any)} />),
};

export const Banner: Story = {
  args: {
    label: 'Remote edits were detected',
    detail: 'Reload to reconcile with the latest trip data.',
    tone: 'warning',
    variant: 'banner',
    actions: (
      <button
        type="button"
        onClick={retrySpy}
        className="rounded-xl border border-current px-3 py-1.5 text-xs font-semibold"
      >
        Reload
      </button>
    ),
  },
  render: (args) => storyFrame('max-w-[760px]', <StatusMessage {...(args as any)} />),
  play: async ({ canvasElement }) => {
    retrySpy.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /reload/i }));
    await expect(retrySpy).toHaveBeenCalledTimes(1);
  },
};

export const SpinningState: Story = {
  args: {
    label: 'Calculating routes',
    tone: 'info',
    variant: 'badge',
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
  },
  render: (args) => storyFrame('max-w-[180px]', <StatusMessage {...(args as any)} />),
};

export const NarrowBanner: Story = {
  args: {
    label: 'Remote edits were detected',
    detail:
      'Reload to reconcile with the latest trip data before you keep editing this itinerary.',
    tone: 'warning',
    variant: 'banner',
    actions: (
      <>
        <button
          type="button"
          className="rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
        >
          Reload
        </button>
        <button
          type="button"
          className="rounded-full border border-current/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-current/10"
        >
          Dismiss
        </button>
      </>
    ),
  },
  render: (args) => storyFrame('max-w-[360px]', <StatusMessage {...(args as any)} />),
};
