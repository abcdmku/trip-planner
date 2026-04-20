import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';
import { DayList } from './DayList';
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
] satisfies Day[];

const selectSpy = fn();
const deleteSpy = fn();

const meta = {
  title: 'Component Lib/Days/DayList',
  component: DayList,
  tags: ['autodocs'],
  args: {
    days,
    selectedDayId: 'day-2',
    onSelectDay: selectSpy,
    onAddDay: fn(),
    onDeleteDay: deleteSpy,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    days: [],
    selectedDayId: undefined,
    onDeleteDay: undefined,
  },
};

export const SelectsAndDeletes: Story = {
  args: {
    onSelectDay: selectSpy,
    onDeleteDay: deleteSpy,
  },
  play: async ({ canvasElement }) => {
    selectSpy.mockClear();
    deleteSpy.mockClear();

    const canvas = within(canvasElement);
    const arrivalRow = canvas.getByText('Arrival Day').closest('button');
    if (!arrivalRow) {
      throw new Error('Arrival Day row was not found');
    }
    await userEvent.click(arrivalRow);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Museum Day' }));
  },
};
