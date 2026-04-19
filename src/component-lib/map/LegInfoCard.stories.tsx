import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LegInfoCard } from './LegInfoCard';
import { createItemFixture, createLegFixture } from '@/component-lib/story-support/trip-fixtures';

const closeSpy = fn();
const modeSpy = fn();
const routeTypeSpy = fn();

const fromItem = createItemFixture({
  placeName: 'Chicago Union Station',
  scheduledEnd: '2026-05-12T09:20:00.000Z',
});

const toItem = createItemFixture({
  itemId: 'item-2',
  placeName: 'Art Institute of Chicago',
  scheduledStart: '2026-05-12T10:00:00.000Z',
});

const meta = {
  title: 'Map/LegInfoCard',
  component: LegInfoCard,
  tags: ['autodocs'],
  args: {
    leg: createLegFixture({
      mode: 'walking',
      durationMinutes: 18,
      distanceMeters: 1400,
      routeType: 'directions',
    }),
    fromName: fromItem.placeName,
    toName: toItem.placeName,
    feasibility: {
      status: 'comfortable',
      color: '#10B981',
      label: 'Comfortable',
    },
    onClose: closeSpy,
    onModeChange: modeSpy,
    onRouteTypeChange: routeTypeSpy,
    openInGoogleMapsUrl: 'https://maps.google.com',
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-end justify-center bg-theme-subtle p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LegInfoCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TightConnection: Story = {
  args: {
    leg: createLegFixture({
      mode: 'transit',
      durationMinutes: 34,
      distanceMeters: 12100,
    }),
    feasibility: {
      status: 'tight',
      color: '#F59E0B',
      label: 'Tight',
    },
  },
};

export const StraightLineRoute: Story = {
  args: {
    leg: createLegFixture({
      mode: 'flight',
      durationMinutes: 95,
      distanceMeters: 291000,
      routeType: 'straight',
    }),
    feasibility: null,
  },
};

export const ReadOnly: Story = {
  args: {
    onModeChange: undefined,
    onRouteTypeChange: undefined,
    openInGoogleMapsUrl: null,
  },
};

export const InteractiveActions: Story = {
  play: async ({ canvasElement }) => {
    closeSpy.mockClear();
    modeSpy.mockClear();
    routeTypeSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTitle('Drive'));
    await userEvent.click(canvas.getByTitle('Straight'));
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));

    await expect(modeSpy).toHaveBeenCalledWith('driving');
    await expect(routeTypeSpy).toHaveBeenCalledWith('straight');
    await expect(closeSpy).toHaveBeenCalledTimes(1);
  },
};
