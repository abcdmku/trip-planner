import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimelineOverlayCard } from './TimelineOverlayCard';

const meta = {
  title: 'Timeline/TimelineOverlayCard',
  component: TimelineOverlayCard,
  tags: ['autodocs'],
  args: {
    top: 48,
    height: 96,
    left: 8,
    right: 8,
    zIndex: 40,
    className: 'bg-theme-elevated',
    children: (
      <div className="flex h-full flex-col justify-between p-2">
        <div className="text-sm font-semibold text-theme">Preview block</div>
        <div className="text-xs text-theme-secondary">07:30 - 09:00</div>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="relative h-[240px] w-[240px] overflow-hidden rounded-xl border border-theme bg-theme-elevated">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineOverlayCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ErrorTone: Story = {
  args: {
    className: 'bg-[rgba(220,38,38,0.12)] border-red-500/70',
    children: (
      <div className="flex h-full flex-col justify-between p-2">
        <div className="text-sm font-semibold text-red-600">Unavailable</div>
        <div className="text-xs text-red-500">11:00 - 12:30</div>
      </div>
    ),
  },
};
