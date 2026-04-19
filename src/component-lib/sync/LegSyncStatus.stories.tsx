import type { Meta, StoryObj } from '@storybook/react-vite';
import { LegSyncStatus } from './LegSyncStatus';

const meta = {
  title: 'Component Lib/Sync/LegSyncStatus',
  component: LegSyncStatus,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline status text for route recalculation progress. Stories cover the calculating, stale, and fully synced states.',
      },
    },
  },
  render: (args) => (
    <div className="min-h-[160px] bg-theme p-6">
      <LegSyncStatus {...args} />
    </div>
  ),
  args: {
    isCalculating: false,
    totalLegs: 4,
    staleCount: 0,
  },
} satisfies Meta<typeof LegSyncStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Synced: Story = {};

export const Calculating: Story = {
  args: {
    isCalculating: true,
  },
};

export const NeedsRecalculation: Story = {
  args: {
    staleCount: 2,
  },
};
