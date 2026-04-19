import type { Meta, StoryObj } from '@storybook/react-vite';
import { ItemRouteSummary } from './ItemRouteSummary';

const meta = {
  title: 'Component Lib/Items/ItemRouteSummary',
  component: ItemRouteSummary,
  tags: ['autodocs'],
  args: {
    originTitle: 'Art Institute of Chicago',
    originSubtitle: '111 S Michigan Ave, Chicago, IL 60603',
    destinationTitle: 'Chicago Riverwalk',
    destinationSubtitle: 'Chicago Riverwalk, Chicago, IL 60601',
    travelBadge: 'Walk · Routed · 18m',
  },
  render: (args) => (
    <div className="max-w-md bg-theme p-6">
      <ItemRouteSummary {...args} />
    </div>
  ),
} satisfies Meta<typeof ItemRouteSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MissingDestination: Story = {
  args: {
    destinationSubtitle: undefined,
    travelBadge: undefined,
    emptyDestinationLabel: 'Optional',
  },
};
