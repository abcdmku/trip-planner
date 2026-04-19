import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypeIcon } from './TypeIcon';
import type { ItemType } from '@/types/trip';

const itemTypes: ItemType[] = ['attraction', 'restaurant', 'hotel', 'transport', 'activity', 'other'];

const meta = {
  title: 'Component Lib/Shared/TypeIcon',
  component: TypeIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Type glyph for itinerary items. Stories render a full matrix so each supported item type and size variant is reviewable in isolation.',
      },
    },
  },
  args: {
    type: 'attraction',
    size: 'md',
    showBackground: true,
  },
  render: (args) => (
    <div className="min-h-[320px] bg-theme p-6 text-theme">
      <div className="space-y-4 rounded-2xl border border-theme bg-theme-elevated p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Single icon preview</p>
            <p className="text-xs text-theme-secondary">Use controls to inspect a single item type.</p>
          </div>
          <TypeIcon {...args} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {itemTypes.map((type) => (
            <div key={type} className="rounded-xl border border-theme bg-theme px-3 py-3">
              <div className="flex items-center gap-2">
                <TypeIcon type={type} size="sm" />
                <span className="text-xs font-medium capitalize text-theme-secondary">{type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
} satisfies Meta<typeof TypeIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoBackground: Story = {
  args: {
    showBackground: false,
    type: 'restaurant',
  },
};

export const LargeAttraction: Story = {
  args: {
    size: 'lg',
    type: 'attraction',
  },
};
