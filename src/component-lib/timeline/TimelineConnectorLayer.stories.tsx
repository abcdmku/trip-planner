import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TimelineConnectorLayer } from './TimelineConnectorLayer';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';

const clickSpy = fn();
const removeSpy = fn();

const connectors: TimelineConnectorWithTiming[] = [
  {
    id: 'connector-1',
    dayId: 'day-1',
    fromItemId: 'item-1',
    toItemId: 'item-2',
    fromEndMin: 600,
    toStartMin: 660,
    gapMinutes: 60,
  },
  {
    id: 'connector-2',
    dayId: 'day-1',
    fromItemId: 'item-2',
    toItemId: 'item-3',
    fromEndMin: 780,
    toStartMin: 810,
    gapMinutes: 30,
  },
];

const meta = {
  title: 'Timeline/TimelineConnectorLayer',
  component: TimelineConnectorLayer,
  tags: ['autodocs'],
  args: {
    connectors,
    dayColor: '#0EA5E9',
    startHour: 8,
    pxPerMin: 1,
    left: 24,
    width: 48,
    onConnectorClick: clickSpy,
    onConnectorRemove: removeSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-8">
        <div className="relative h-[640px] w-24 rounded-xl border border-theme bg-theme-elevated">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineConnectorLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutRemove: Story = {
  args: {
    onConnectorRemove: undefined,
  },
};

export const InteractiveLayer: Story = {
  play: async ({ canvasElement }) => {
    clickSpy.mockClear();
    removeSpy.mockClear();

    const canvas = within(canvasElement);
    const labels = canvas.getAllByText(/m$/);
    await userEvent.click(labels[0]);

    const removeButtons = canvas.getAllByTitle('Remove connection');
    await userEvent.click(removeButtons[0]);

    await expect(clickSpy).toHaveBeenCalledTimes(1);
    await expect(removeSpy).toHaveBeenCalledTimes(1);
  },
};
