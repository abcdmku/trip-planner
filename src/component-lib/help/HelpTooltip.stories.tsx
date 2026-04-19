import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { HelpTooltip } from './HelpTooltip';

const meta = {
  title: 'Component Lib/Help/HelpTooltip',
  component: HelpTooltip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Accessible inline help affordance with controlled and uncontrolled open states. Stories verify click, Escape, and placement variants without relying on any external runtime.',
      },
    },
  },
  args: {
    content: 'This setting affects how route calculations treat optional stops.',
    label: 'Trip planning help',
    title: 'Route timing',
    side: 'top',
  },
} satisfies Meta<typeof HelpTooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /trip planning help/i });

    await userEvent.click(trigger);
    await expect(canvas.getByRole('tooltip')).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('tooltip')).toBeNull();
  },
};

export const OpenByDefault: Story = {
  args: {
    defaultOpen: true,
  },
};

export const RightPlacement: Story = {
  args: {
    side: 'right',
    title: 'More detail',
  },
};
