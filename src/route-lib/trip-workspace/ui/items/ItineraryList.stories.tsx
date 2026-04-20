import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { createDayFixture, createItemFixture } from '@/component-lib/story-support/trip-fixtures';
import { ItineraryList } from './ItineraryList';

const dayOne = createDayFixture({
  dayId: 'day-1',
  date: '2026-05-12',
  label: 'Day 1',
  colorHex: '#2563EB',
  timezone: 'America/Chicago',
});

const dayTwo = createDayFixture({
  dayId: 'day-2',
  date: '2026-05-13',
  label: 'Day 2',
  colorHex: '#16A34A',
  timezone: 'America/New_York',
});

const overnightItem = createItemFixture({
  itemId: 'item-overnight',
  dayId: dayOne.dayId,
  placeName: 'Overnight Train',
  scheduledStart: '23:30',
  scheduledEnd: '23:59',
  durationMinutes: 180,
});

const meta = {
  title: 'Route Lib/Trip Workspace/ItineraryList',
  component: ItineraryList,
  tags: ['autodocs'],
  args: {
    items: [overnightItem],
    days: [dayOne, dayTwo],
    selectedDayId: dayTwo.dayId,
    displayItemsById: new Map([
      [
        overnightItem.itemId,
        createItemFixture({
          itemId: overnightItem.itemId,
          dayId: dayTwo.dayId,
          placeName: overnightItem.placeName,
          scheduledStart: '00:30',
          scheduledEnd: '03:30',
          durationMinutes: overnightItem.durationMinutes,
        }),
      ],
    ]),
    onAddItem: fn(),
    onDeleteItem: fn(),
    onExpandedItemChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="max-w-sm rounded-2xl border border-theme bg-theme-elevated">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof ItineraryList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SelectedDayTimezone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('12:30a - 3:30a EDT')).toBeInTheDocument();
  },
};
