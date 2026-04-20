import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ItemCard } from './ItemCard';
import { createItemFixture } from '@/component-lib/story-support/trip-fixtures';

const baseItem = createItemFixture();
const itemCardToggleExpandSpy = fn();
const itemCardDeleteSpy = fn();

const meta = {
  title: 'Items/ItemCard',
  component: ItemCard,
  tags: ['autodocs'],
  args: {
    item: baseItem,
    dayColor: '#F59E0B',
    timezoneLabel: 'CDT',
    isSelected: false,
    isExpanded: false,
    isDragging: false,
    onToggleExpand: fn(),
    onDelete: fn(),
    onClick: fn(),
  },
} satisfies Meta<typeof ItemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

export const LockedAndOptional: Story = {
  args: {
    item: createItemFixture({
      placeName: 'Hotel check-in',
      type: 'hotel',
      isOptional: true,
      timelineLocked: true,
      scheduledStart: '15:00',
      scheduledEnd: '15:30',
      durationMinutes: 30,
    }),
  },
};

export const MultiDay: Story = {
  args: {
    dayColors: ['#F59E0B', '#0EA5E9', '#22C55E'],
    item: createItemFixture({
      placeName: 'Riverwalk photo session',
      durationMinutes: 45,
      scheduledStart: '18:30',
      scheduledEnd: '19:15',
    }),
  },
};

export const SelectedDayCarryover: Story = {
  args: {
    item: createItemFixture({
      itemId: 'item-overnight-origin',
      placeName: 'Overnight Train',
      scheduledStart: '23:30',
      scheduledEnd: '23:59',
      durationMinutes: 180,
    }),
    displayItem: createItemFixture({
      itemId: 'item-overnight-origin',
      placeName: 'Overnight Train',
      scheduledStart: '00:30',
      scheduledEnd: '03:30',
      durationMinutes: 180,
    }),
    timezoneLabel: 'EDT',
    dayColors: ['#F59E0B', '#0EA5E9'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('12:30a - 3:30a EDT')).toBeInTheDocument();
  },
};

export const InteractiveActions: Story = {
  args: {
    onToggleExpand: itemCardToggleExpandSpy,
    onDelete: itemCardDeleteSpy,
  },
  play: async ({ canvasElement }) => {
    itemCardToggleExpandSpy.mockClear();
    itemCardDeleteSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Expand' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete item' }));

    await expect(itemCardToggleExpandSpy).toHaveBeenCalledTimes(1);
    await expect(itemCardDeleteSpy).toHaveBeenCalledTimes(1);
  },
};
