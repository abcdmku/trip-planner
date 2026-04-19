import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemoteItemPresenceBadge } from './RemoteItemPresenceBadge';
import type { RemoteObjectPresence } from '@/types/collaboration';

const presence: RemoteObjectPresence[] = [
  {
    connectionId: 'maya',
    userId: 'user-maya',
    name: 'Maya Patel',
    picture: '',
    color: '#2563EB',
    kind: 'selection',
    label: 'Selection',
  },
  {
    connectionId: 'nora',
    userId: 'user-nora',
    name: 'Nora Kim',
    picture: '',
    color: '#DB2777',
    kind: 'move',
    label: 'Moving',
  },
  {
    connectionId: 'sam',
    userId: 'user-sam',
    name: 'Sam Ortega',
    picture: '',
    color: '#059669',
    kind: 'edit',
    label: 'Editing',
  },
];

const meta = {
  title: 'Component Lib/Presence/RemoteItemPresenceBadge',
  component: RemoteItemPresenceBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact badge cluster that overlays item cards when collaborators are present. Stories cover the empty state, the normal two-person cap, and overflow handling.',
      },
    },
  },
  render: (args) => (
    <div className="relative min-h-[220px] rounded-2xl border border-theme bg-theme-elevated p-6">
      <div className="relative h-36 rounded-2xl border border-dashed border-theme bg-theme-subtle">
        <div className="p-4 text-sm text-theme-secondary">Trip item card preview</div>
        <RemoteItemPresenceBadge {...args} />
        {args.presence.length === 0 ? (
          <div className="absolute inset-x-4 bottom-4 text-xs text-theme-tertiary">
            No collaborators are editing this item right now.
          </div>
        ) : null}
      </div>
    </div>
  ),
  args: {
    presence,
  },
} satisfies Meta<typeof RemoteItemPresenceBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Overflow: Story = {
  args: {
    presence: presence.concat({
      connectionId: 'lee',
      userId: 'user-lee',
      name: 'Lee Chen',
      picture: '',
      color: '#0F766E',
      kind: 'transform',
      label: 'Transforming',
    }),
  },
};

export const Empty: Story = {
  args: {
    presence: [],
  },
};
