import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { TimelineAvailabilityBands } from './TimelineAvailabilityBands';

const meta = {
  title: 'Timeline/TimelineAvailabilityBands',
  component: TimelineAvailabilityBands,
  tags: ['autodocs'],
  args: {
    bands: [
      { startMin: 510, endMin: 600 },
      { startMin: 660, endMin: 720 },
    ],
    dayColor: '#0EA5E9',
    globalStartH: 8,
    pxPerMin: 1,
    left: 8,
    right: 8,
    label: true,
    labelSize: 'standard',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="relative h-[420px] w-[240px] overflow-hidden rounded-xl border border-theme bg-theme-elevated">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineAvailabilityBands>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LabeledBands: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('8:30a - 10a')).toBeInTheDocument();
    await expect(canvas.getByText('11a - 12p')).toBeInTheDocument();
  },
};

export const CompactBands: Story = {
  args: {
    labelSize: 'compact',
    label: false,
    dayColor: '#F59E0B',
  },
};

export const Empty: Story = {
  args: {
    bands: [],
  },
};
