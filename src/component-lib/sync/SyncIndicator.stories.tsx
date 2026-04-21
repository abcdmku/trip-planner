import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SyncIndicator, type SyncIndicatorProps } from './SyncIndicator';

const onRetrySpy = fn();

function renderInSlot(args: SyncIndicatorProps, widthClass = 'max-w-[220px]') {
  return (
    <div className="min-h-[140px] bg-theme p-6">
      <div className={widthClass}>
        <SyncIndicator {...args} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Component Lib/Sync/SyncIndicator',
  component: SyncIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact connectivity and save-state indicator. Stories cover every status, including the retry action for failures and the timestamped synced state.',
      },
    },
  },
  args: {
    status: 'idle',
    lastSyncedAt: new Date('2026-04-19T15:10:00.000Z'),
    onRetry: onRetrySpy,
  },
  render: (args) => renderInSlot(args),
} satisfies Meta<typeof SyncIndicator>;

export default meta;

type Story = StoryObj<SyncIndicatorProps>;

export const Idle: Story = {};

export const Syncing: Story = {
  args: {
    status: 'syncing',
  },
};

export const Synced: Story = {
  args: {
    status: 'synced',
  },
};

export const Offline: Story = {
  args: {
    status: 'offline',
  },
};

export const ErrorState: Story = {
  args: {
    status: 'error',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /retry/i }));
    await expect(onRetrySpy).toHaveBeenCalledTimes(1);
  },
};

export const HeaderSlotStress: Story = {
  args: {
    status: 'error',
  },
  render: (args) => renderInSlot(args, 'max-w-[180px]'),
};
