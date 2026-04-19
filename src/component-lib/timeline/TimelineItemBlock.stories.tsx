import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TimelineItemBlock } from './TimelineItemBlock';
import { createItemFixture } from '@/component-lib/story-support/trip-fixtures';
import type { RemoteObjectPresence } from '@/types/collaboration';

const remotePresence: RemoteObjectPresence[] = [
  {
    connectionId: 'conn-1',
    userId: 'maya',
    name: 'Maya Patel',
    picture: '',
    color: '#2563EB',
    kind: 'selection',
    label: 'Selecting',
  },
  {
    connectionId: 'conn-2',
    userId: 'nora',
    name: 'Nora Kim',
    picture: '',
    color: '#DB2777',
    kind: 'move',
    label: 'Moving',
  },
];

const meta = {
  title: 'Timeline/TimelineItemBlock',
  component: TimelineItemBlock,
  tags: ['autodocs'],
  args: {
    item: createItemFixture(),
    dayColor: '#F59E0B',
    startMin: 540,
    endMin: 660,
    height: 88,
    density: 'day',
    isSelected: false,
    isActive: false,
    presence: [],
    onPointerDown: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="w-[280px]">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineItemBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

export const TransportCompact: Story = {
  args: {
    density: 'multi',
    height: 56,
    item: createItemFixture({
      type: 'transport',
      placeName: 'Blue line transfer',
      transportMode: 'transit',
      itemRouteDurationMinutes: 35,
    }),
  },
};

export const LockedCollaborative: Story = {
  args: {
    isActive: true,
    presence: remotePresence,
    item: createItemFixture({
      type: 'activity',
      placeName: 'Boat tour boarding',
      timelineLocked: true,
    }),
  },
};
