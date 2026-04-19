import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
  GettingStarted,
  DEFAULT_GETTING_STARTED_STEPS,
  type GettingStartedProps,
} from './GettingStarted';

const onStepChangeSpy = fn();
const onDismissSpy = fn();

const meta = {
  title: 'Component Lib/Help/GettingStarted',
  component: GettingStarted,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Onboarding checklist for first-time users. Stories include the default step list, an empty fallback, and an interaction path that selects a step and dismisses the panel.',
      },
    },
  },
  args: {
    title: 'Getting Started',
    steps: DEFAULT_GETTING_STARTED_STEPS,
    initialStep: 0,
    onStepChange: onStepChangeSpy,
    onDismiss: onDismissSpy,
    emptyTitle: 'No steps available',
    emptyDescription: 'Add setup steps to guide people through the workflow.',
  },
} satisfies Meta<typeof GettingStarted>;

export default meta;

type Story = StoryObj<GettingStartedProps>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    steps: [],
  },
};

export const ControlledStep: Story = {
  args: {
    currentStep: 2,
  },
};

export const StepInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /view routes on map/i }));
    await expect(onStepChangeSpy).toHaveBeenCalledWith(2);

    await userEvent.click(canvas.getByRole('button', { name: /dismiss getting started/i }));
    await expect(onDismissSpy).toHaveBeenCalledTimes(1);
  },
};
