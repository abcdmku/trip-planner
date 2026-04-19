import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';
import { DayFilter } from './DayFilter';
import type { Day } from '@/types/trip';

const days = [
  {
    dayId: 'day-1',
    label: 'Arrival Day',
    date: '2026-05-12',
    colorHex: '#F59E0B',
    dayStart: '08:00',
    dayEnd: '22:00',
  },
  {
    dayId: 'day-2',
    label: 'Museum Day',
    date: '2026-05-13',
    colorHex: '#3B82F6',
    dayStart: '08:00',
    dayEnd: '22:00',
  },
  {
    dayId: 'day-3',
    label: 'Dinner Day',
    date: '2026-05-14',
    colorHex: '#10B981',
    dayStart: '08:00',
    dayEnd: '22:00',
  },
] satisfies Day[];

const toggleSpy = fn();

const meta = {
  title: 'Component Lib/Days/DayFilter',
  component: DayFilter,
  tags: ['autodocs'],
  args: {
    days,
    selectedDayIds: ['day-1', 'day-3'],
    onToggleDay: toggleSpy,
    onSelectAll: fn(),
    onClearAll: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PartialSelection: Story = {};

export const AllSelected: Story = {
  args: {
    selectedDayIds: [],
  },
};

export const Empty: Story = {
  args: {
    days: [],
    selectedDayIds: [],
  },
};

export const TogglesAChoice: Story = {
  args: {
    onToggleDay: toggleSpy,
  },
  play: async ({ canvasElement }) => {
    toggleSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Museum Day' }));
  },
};
