import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DeleteDayDialog } from './DeleteDayDialog';

const cancelSpy = fn();
const confirmSpy = fn();

const meta = {
  title: 'Component Lib/Days/DeleteDayDialog',
  component: DeleteDayDialog,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    dayLabel: 'Arrival Day',
    eventCount: 2,
    onCancel: cancelSpy,
    onConfirm: confirmSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeleteDayDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoEvents: Story = {
  args: {
    eventCount: 0,
  },
};

export const Deleting: Story = {
  args: {
    isDeleting: true,
  },
};

export const ConfirmsDeletion: Story = {
  args: {
    onConfirm: confirmSpy,
  },
  play: async ({ canvasElement }) => {
    confirmSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Day' }));

    await expect(confirmSpy).toHaveBeenCalledTimes(1);
  },
};
