import type { Meta, StoryObj } from '@storybook/react-vite';
import { ItemLocationCard } from './ItemLocationCard';
import { ItemRouteStopRow } from './ItemRouteStopRow';

const meta = {
  title: 'Component Lib/Items/ItemRouteStopRow',
  component: ItemRouteStopRow,
  tags: ['autodocs'],
  args: {
    marker: 'origin',
    showConnector: true,
  },
  render: (args) => (
    <div className="max-w-md bg-theme p-6">
      <ItemRouteStopRow marker={args.marker} showConnector={args.showConnector} accentColor={args.accentColor}>
        <ItemLocationCard
          title="Art Institute of Chicago"
          subtitle="111 S Michigan Ave, Chicago, IL 60603"
        />
      </ItemRouteStopRow>
    </div>
  ),
} satisfies Meta<typeof ItemRouteStopRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Origin: Story = {};

export const Destination: Story = {
  args: {
    marker: 'destination',
    showConnector: false,
  },
};

export const DayAccent: Story = {
  args: {
    marker: 'origin',
    accentColor: '#0EA5E9',
    showConnector: true,
  },
};
