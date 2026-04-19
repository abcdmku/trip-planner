import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { X } from 'lucide-react';
import { ItemLocationCard } from './ItemLocationCard';

const clickSpy = fn();

const meta = {
  title: 'Component Lib/Items/ItemLocationCard',
  component: ItemLocationCard,
  tags: ['autodocs'],
  args: {
    title: 'Art Institute of Chicago',
    subtitle: '111 S Michigan Ave, Chicago, IL 60603',
  },
  render: (args) => (
    <div className="max-w-md bg-theme p-6">
      <ItemLocationCard {...args} />
    </div>
  ),
} satisfies Meta<typeof ItemLocationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    title: 'Add destination',
    subtitle: undefined,
    description: 'Add one to estimate travel time and open the route in Maps.',
  },
};

export const Interactive: Story = {
  args: {
    onClick: clickSpy,
    ariaLabel: 'Edit origin',
  },
  play: async ({ canvasElement }) => {
    clickSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit origin' }));

    await expect(clickSpy).toHaveBeenCalledTimes(1);
  },
};

export const WithActions: Story = {
  args: {
    title: 'Chicago Riverwalk',
    subtitle: 'Chicago Riverwalk, Chicago, IL 60601',
    paddedForActions: true,
    actions: (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-theme-tertiary hover:bg-theme hover:text-theme"
        aria-label="Clear destination"
      >
        <X className="h-4 w-4" />
      </button>
    ),
  },
};
