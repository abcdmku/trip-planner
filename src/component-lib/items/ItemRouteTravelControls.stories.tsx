import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import {
  ItemRouteTravelControls,
  type ItemRouteTravelControlsProps,
} from './ItemRouteTravelControls';
import { mobileStoryGlobals } from '@/storybook/viewports';

const changeSpy = fn();
const calculateSpy = fn();

function InteractiveControlsStory({
  args,
  containerClassName = 'max-w-md bg-theme p-6',
}: {
  args: Partial<ItemRouteTravelControlsProps>;
  containerClassName?: string;
}) {
  const [state, setState] = useState({
    transportMode: args?.transportMode ?? 'walking',
    itemRouteType: args?.itemRouteType ?? 'directions',
  });

  return (
    <div className={containerClassName}>
      <ItemRouteTravelControls
        {...args}
        transportMode={state.transportMode}
        itemRouteType={state.itemRouteType}
        onChange={(next) => {
          setState(next);
          args?.onChange?.(next);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof ItemRouteTravelControls> = {
  title: 'Component Lib/Items/ItemRouteTravelControls',
  component: ItemRouteTravelControls,
  tags: ['autodocs'],
  args: {
    transportMode: 'walking',
    itemRouteType: 'directions',
    hasOrigin: true,
    hasDestination: true,
    canCalculateRoute: true,
    hasCalculatedRoute: false,
    travelDurationMinutes: 18,
    onChange: changeSpy,
    onCalculateRoute: calculateSpy,
  },
  render: (args: ItemRouteTravelControlsProps) => <InteractiveControlsStory args={args} />,
};

export default meta;

type Story = StoryObj<typeof ItemRouteTravelControls>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const CompactMobile = {
  args: {
    compact: true,
  },
  globals: mobileStoryGlobals,
  render: (args: ItemRouteTravelControlsProps) => (
    <InteractiveControlsStory args={args} containerClassName="w-full bg-theme p-4" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Walk')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Walk' })).toBeInTheDocument();
  },
} as Story;

export const StraightLineOnly: Story = {
  args: {
    transportMode: 'other',
    itemRouteType: 'straight',
    hasOrigin: false,
    hasDestination: false,
    canCalculateRoute: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Straight line only')).toBeInTheDocument();
  },
};

export const CalculateRoute: Story = {
  play: async ({ canvasElement }) => {
    changeSpy.mockClear();
    calculateSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Calculate travel time' }));

    await expect(calculateSpy).toHaveBeenCalledTimes(1);
  },
};

export const Calculating: Story = {
  args: {
    isCalculatingRoute: true,
    hasCalculatedRoute: false,
    travelDurationMinutes: 0,
  },
};

export const FlightWithMapsLink: Story = {
  args: {
    transportMode: 'flight',
    itemRouteType: 'straight',
    hasOrigin: true,
    hasDestination: true,
    canCalculateRoute: false,
    openInGoogleMapsUrl: 'https://maps.google.com',
  },
};
