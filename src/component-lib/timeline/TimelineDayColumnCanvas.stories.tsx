import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TimelineDayColumnCanvas } from './TimelineDayColumnCanvas';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import {
  createDayFixture,
  createItemFixture,
} from '@/component-lib/story-support/trip-fixtures';

const backgroundSpy = fn();
const dragSpy = fn();
const dropSpy = fn();
const dragLeaveSpy = fn();
const itemPointerSpy = fn();
const connectorSpy = fn();
const connectorRemoveSpy = fn();

const day = createDayFixture({
  dayId: 'day-1',
  date: '2026-05-12',
  label: 'Museum day',
  colorHex: '#0EA5E9',
});

const items = [
  createItemFixture({
    itemId: 'item-1',
    dayId: day.dayId,
    placeName: 'Chicago Architecture Center',
    type: 'activity',
    scheduledStart: '2026-05-12T09:00:00.000Z',
    scheduledEnd: '2026-05-12T10:30:00.000Z',
    availabilityWindows: JSON.stringify({
      version: 3,
      entries: [{ kind: 'date', date: '2026-05-12', startTime: '08:30', endTime: '12:00' }],
    }),
  }),
  createItemFixture({
    itemId: 'item-2',
    dayId: day.dayId,
    placeName: 'Lunch at The Gage',
    type: 'restaurant',
    scheduledStart: '2026-05-12T12:00:00.000Z',
    scheduledEnd: '2026-05-12T13:15:00.000Z',
    availabilityWindows: JSON.stringify({
      version: 3,
      entries: [{ kind: 'date', date: '2026-05-12', startTime: '11:30', endTime: '15:00' }],
    }),
  }),
];

const connectors: TimelineConnectorWithTiming[] = [
  {
    id: 'connector-1',
    dayId: day.dayId,
    fromItemId: 'item-1',
    toItemId: 'item-2',
    fromEndMin: 630,
    toStartMin: 720,
    gapMinutes: 90,
  },
];

const gHours = Array.from({ length: 17 }, (_, index) => 7 + index);

function getItemVisualPosition(item: (typeof items)[number], startHour: number) {
  const startMin = toMinutes(item.scheduledStart);
  const endMin = toMinutes(item.scheduledEnd);
  return {
    top: (startMin - startHour * 60) * 1.2,
    height: Math.max(24, (endMin - startMin) * 1.2),
    startMin,
    endMin,
    active: false,
  };
}

const meta = {
  title: 'Timeline/TimelineDayColumnCanvas',
  component: TimelineDayColumnCanvas,
  tags: ['autodocs'],
  args: {
    day,
    dayItems: items,
    allItems: items,
    pxPerMin: 1.2,
    pxPerHr: 72,
    globalStartH: 7,
    globalEndH: 23,
    gTotalH: 72 * 16,
    gHours,
    nowMin: 11 * 60 + 30,
    selectedItemId: 'item-1',
    activeDragItemId: null,
    interaction: { type: 'idle' },
    externalPreview: null,
    crossDayDragPreview: null,
    onBackgroundPointerDown: backgroundSpy,
    onPointDragOver: dragSpy,
    onPointDrop: dropSpy,
    onPointDragLeave: dragLeaveSpy,
    onItemPointerDown: itemPointerSpy,
    getItemVisualPosition,
    connectors,
    onConnectorClick: connectorSpy,
    onConnectorRemove: connectorRemoveSpy,
    showConnectors: true,
    remoteObjectPresenceByItemId: new Map(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="w-[240px] overflow-hidden rounded-xl border border-theme bg-theme-elevated">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineDayColumnCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    dayItems: [],
    allItems: [],
    selectedItemId: null,
    connectors: [],
  },
};

export const CreatingState: Story = {
  args: {
    interaction: { type: 'creating', startMin: 870, endMin: 930 },
  },
};

export const ExternalDropPreview: Story = {
  args: {
    activeDragItemId: 'item-2',
    externalPreview: {
      itemId: 'item-2',
      dayId: day.dayId,
      valid: true,
      startMin: 900,
      endMin: 975,
    },
  },
};

export const CrossDayTarget: Story = {
  args: {
    crossDayDragPreview: {
      itemId: 'item-2',
      targetDayId: day.dayId,
      startMin: 840,
      endMin: 915,
    },
  },
};

export const InteractiveCanvas: Story = {
  play: async ({ canvasElement }) => {
    itemPointerSpy.mockClear();
    connectorSpy.mockClear();
    connectorRemoveSpy.mockClear();

    const canvas = within(canvasElement);
    const itemTitle = canvas.getByText('Chicago Architecture Center');
    await userEvent.pointer([{ target: itemTitle, keys: '[MouseLeft]' }]);
    await userEvent.click(canvas.getByText('1h 30m'));
    await userEvent.click(canvas.getByTitle('Remove connection'));

    await expect(itemPointerSpy).toHaveBeenCalledTimes(1);
    await expect(connectorSpy).toHaveBeenCalledTimes(1);
    await expect(connectorRemoveSpy).toHaveBeenCalledTimes(1);
  },
};

function toMinutes(value: string): number {
  const part = value.includes('T') ? value.split('T')[1] : value;
  const [hours, minutes] = part.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
