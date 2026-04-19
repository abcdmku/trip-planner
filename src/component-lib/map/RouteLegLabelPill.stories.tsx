import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { RouteLegLabelPill } from './RouteLegLabelPill';

const modeSpy = fn();

const meta = {
  title: 'Map/RouteLegLabelPill',
  component: RouteLegLabelPill,
  tags: ['autodocs'],
  args: {
    mode: 'walking',
    durationMinutes: 18,
    color: '#10B981',
    isRecalculating: false,
    onModeChange: modeSpy,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-center justify-center bg-theme-subtle p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteLegLabelPill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Recalculating: Story = {
  args: {
    isRecalculating: true,
  },
};

export const LongRoute: Story = {
  args: {
    mode: 'transit',
    durationMinutes: 185,
    color: '#F59E0B',
  },
};

export const ReadOnly: Story = {
  args: {
    onModeChange: undefined,
  },
};

export const InteractiveModeSwitch: Story = {
  play: async ({ canvasElement }) => {
    modeSpy.mockClear();
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /18m/i }));
    await userEvent.click(canvas.getByTitle('Drive'));

    await expect(modeSpy).toHaveBeenCalledWith('driving');
  },
};
