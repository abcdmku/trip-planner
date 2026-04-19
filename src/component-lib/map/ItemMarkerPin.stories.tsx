import type { Meta, StoryObj } from '@storybook/react-vite';
import { ItemMarkerPin } from './ItemMarkerPin';

const meta = {
  title: 'Map/ItemMarkerPin',
  component: ItemMarkerPin,
  tags: ['autodocs'],
  args: {
    itemType: 'attraction',
    isSelected: false,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-center justify-center bg-theme-subtle p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ItemMarkerPin>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

export const Hotel: Story = {
  args: {
    itemType: 'hotel',
  },
};
