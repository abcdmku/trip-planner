import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { TimelineViewControls } from './TimelineViewControls';

const prevSpy = fn();
const resetZoomSpy = fn();
const modeSpy = fn();
const toggleConnectorsSpy = fn();

const meta = {
  title: 'Timeline/TimelineViewControls',
  component: TimelineViewControls,
  tags: ['autodocs'],
  args: {
    viewMode: 'day',
    showPrev: true,
    showNext: true,
    canZoomOut: true,
    canZoomIn: true,
    zoomPercent: 100,
    snapMinutes: 15,
    showConnectors: true,
    onPrev: prevSpy,
    onNext: fn(),
    onZoomOut: fn(),
    onZoomIn: fn(),
    onResetZoom: resetZoomSpy,
    onSnapMinutesChange: fn(),
    onModeChange: modeSpy,
    onToggleConnectors: toggleConnectorsSpy,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineViewControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DayMode: Story = {};

export const MultiMode: Story = {
  args: {
    viewMode: 'multi',
  },
};

export const DisabledEdges: Story = {
  args: {
    showPrev: false,
    showNext: false,
    canZoomOut: false,
    canZoomIn: false,
    showConnectors: false,
  },
};

export const InteractiveControls: Story = {
  play: async ({ canvasElement }) => {
    prevSpy.mockClear();
    resetZoomSpy.mockClear();
    toggleConnectorsSpy.mockClear();
    modeSpy.mockClear();

    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole('button');

    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[3]);
    await userEvent.click(buttons[7]);

    await expect(toggleConnectorsSpy).toHaveBeenCalledTimes(1);
    await expect(resetZoomSpy).toHaveBeenCalledTimes(1);
    await expect(modeSpy).toHaveBeenCalledWith('multi');
  },
};
