import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DayTabs } from './DayTabs';
import type { Day } from '@/types/trip';

const days = [
  {
    dayId: 'day-1',
    label: 'Arrival Day',
    date: '2026-05-12',
    colorHex: '#F59E0B',
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
  },
  {
    dayId: 'day-2',
    label: 'Museum Day',
    date: '2026-05-13',
    colorHex: '#3B82F6',
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
  },
  {
    dayId: 'day-3',
    label: 'Dinner Day',
    date: '2026-05-14',
    colorHex: '#10B981',
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
  },
] satisfies Day[];

const selectSpy = fn();
const addSpy = fn();

const meta = {
  title: 'Component Lib/Days/DayTabs',
  component: DayTabs,
  tags: ['autodocs'],
  args: {
    days,
    selectedDayId: 'day-2',
    onSelectDay: selectSpy,
    onAddDay: addSpy,
    onDeleteSelectedDay: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('May 12')).toBeVisible();
    await expect(canvas.getByText('May 13')).toBeVisible();
    await expect(canvas.queryByText('2026-05-12')).toBeNull();
  },
};

export const DragTargetState: Story = {
  args: {
    draggingItemId: 'item-1',
    dropValidityByDay: {
      'day-1': true,
      'day-2': false,
      'day-3': true,
    },
  },
};

export const InteractsWithTabs: Story = {
  args: {
    onSelectDay: selectSpy,
    onAddDay: addSpy,
  },
  play: async ({ canvasElement }) => {
    selectSpy.mockClear();
    addSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'All Days' }));
    await userEvent.click(canvas.getByRole('button', { name: /Museum Day/i }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add day' }));

    await expect(selectSpy).toHaveBeenCalledWith('day-2');
    await expect(addSpy).toHaveBeenCalledTimes(1);
  },
};
