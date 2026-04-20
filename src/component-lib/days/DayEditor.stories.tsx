import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DayEditor } from './DayEditor';
import type { Day } from '@/types/trip';

const saveSpy = fn();

const existingDay = {
  dayId: 'day-arrival',
  label: 'Arrival Day',
  date: '2026-05-12',
  colorHex: '#F59E0B',
  dayStart: '09:00',
  dayEnd: '21:00',
  timezone: 'America/Chicago',
} satisfies Day;

const meta = {
  title: 'Component Lib/Days/DayEditor',
  component: DayEditor,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    defaultLabel: 'Trip Day',
    defaultDate: '2026-05-12',
    baseTimezone: 'America/Chicago',
    onClose: fn(),
    onSave: saveSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewDay: Story = {};

export const EditExistingDay: Story = {
  args: {
    day: existingDay,
    defaultLabel: 'Chicago Trip',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const SavesChanges: Story = {
  args: {
    onSave: saveSpy,
  },
  play: async ({ canvasElement }) => {
    saveSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText('Label'));
    await userEvent.type(canvas.getByLabelText('Label'), 'Museum morning');
    await userEvent.clear(canvas.getByLabelText('Date'));
    await userEvent.type(canvas.getByLabelText('Date'), '2026-05-13');
    await userEvent.selectOptions(canvas.getByLabelText('Timezone'), 'Europe/London');
    await userEvent.click(canvas.getByRole('button', { name: /Color #f59e0b/i }));
    await userEvent.click(canvas.getByRole('button', { name: 'Add Day' }));

    await expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Museum morning',
        date: '2026-05-13',
        timezone: 'Europe/London',
      }),
    );
  },
};
