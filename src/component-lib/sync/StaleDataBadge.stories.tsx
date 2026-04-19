import type { Meta, StoryObj } from '@storybook/react-vite';
import { StaleDataBadge } from './StaleDataBadge';

const meta = {
  title: 'Component Lib/Sync/StaleDataBadge',
  component: StaleDataBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Small warning badge used when a view may be stale. Stories show the default copy and a custom message for route-lib adapters.',
      },
    },
  },
  render: (args) => (
    <div className="min-h-[120px] bg-theme p-6">
      <StaleDataBadge {...args} />
    </div>
  ),
} satisfies Meta<typeof StaleDataBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: {
    message: 'Trip data may be stale while collaborators are offline',
  },
};
