import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import {
  ItemRouteTravelControls,
  type ItemRouteTravelControlsProps,
} from './ItemRouteTravelControls';

const changeSpy = fn();
const calculateSpy = fn();

function InteractiveControlsStory(args: Partial<ItemRouteTravelControlsProps>) {
  const [state, setState] = useState({
    transportMode: args?.transportMode ?? 'walking',
    itemRouteType: args?.itemRouteType ?? 'directions',
  });

  return (
    <div className="max-w-md bg-theme p-6">
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

const meta = {
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
  render: (args) => <InteractiveControlsStory {...args} />,
} satisfies Meta<typeof ItemRouteTravelControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const StraightLineOnly: Story = {
  args: {
    transportMode: 'other',
    itemRouteType: 'straight',
    hasOrigin: false,
    hasDestination: false,
    canCalculateRoute: false,
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
