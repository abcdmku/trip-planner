import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  TransportModeSelector,
  type TransportModeSelectorProps,
} from './TransportModeSelector';

const onChangeSpy = fn();

const meta = {
  title: 'Component Lib/Legs/TransportModeSelector',
  component: TransportModeSelector,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Segmented transport picker for leg routing. Stories cover the default and compact presentations, plus click behavior for mode changes.',
      },
    },
  },
  args: {
    value: 'driving',
    compact: false,
    onChange: onChangeSpy,
  },
  render: (args) => (
    <div className="min-h-[180px] bg-theme p-6">
      <TransportModeSelector {...args} />
    </div>
  ),
} satisfies Meta<typeof TransportModeSelector>;

export default meta;

type Story = StoryObj<TransportModeSelectorProps>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Transit' }));
    await expect(onChangeSpy).toHaveBeenCalledWith('transit');
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    value: 'walking',
  },
};

export const TransitSelected: Story = {
  args: {
    value: 'transit',
  },
};
