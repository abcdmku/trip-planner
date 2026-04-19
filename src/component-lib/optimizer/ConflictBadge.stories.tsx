import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConflictBadge } from './ConflictBadge';

const meta = {
  title: 'Component Lib/Optimizer/ConflictBadge',
  component: ConflictBadge,
  tags: ['autodocs'],
  args: {
    message: 'Conflicts with museum lunch',
  },
  decorators: [
    (Story) => (
      <div className="bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConflictBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongMessage: Story = {
  args: {
    message: 'Conflicts with another higher-priority stop in the same time window',
  },
};
