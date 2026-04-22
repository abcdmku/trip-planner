import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { CreateTripDialog } from './CreateTripDialog';

const createTripSpy = fn();

const meta = {
  title: 'Component Lib/Trips/CreateTripDialog',
  component: CreateTripDialog,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onCreate: createTripSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateTripDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const InvalidDateRange: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Trip Name'), 'Broken dates');
    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-05-16');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-05-12');

    await expect(
      canvas.getByText('End date must be the same day or later than the start date.'),
    ).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Create Trip' })).toBeDisabled();
  },
};

export const SubmitsValidTrip: Story = {
  args: {
    onCreate: createTripSpy,
  },
  play: async ({ canvasElement }) => {
    createTripSpy.mockClear();

    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Trip Name'), 'Design Sprint in Chicago');
    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-05-12');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-05-16');
    await userEvent.selectOptions(canvas.getByLabelText('Base Timezone'), 'America/Chicago');
    await userEvent.click(canvas.getByRole('button', { name: 'Create Trip' }));

    await expect(createTripSpy).toHaveBeenCalledWith(
      'Design Sprint in Chicago',
      '2026-05-12',
      '2026-05-16',
      'America/Chicago',
    );
  },
};
