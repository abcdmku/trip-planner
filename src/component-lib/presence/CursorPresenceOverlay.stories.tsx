import type { Meta, StoryObj } from '@storybook/react-vite';
import { CursorPresenceOverlay, type RenderedPresenceCursor } from './CursorPresenceOverlay';

const demoCursors: RenderedPresenceCursor[] = [
  {
    connectionId: 'maya',
    name: 'Maya',
    color: '#2563EB',
    renderedX: 0.18,
    renderedY: 0.22,
    isFading: false,
  },
  {
    connectionId: 'nora',
    name: 'Nora',
    color: '#DB2777',
    renderedX: 0.64,
    renderedY: 0.48,
    isFading: true,
  },
  {
    connectionId: 'sam',
    name: 'Sam',
    color: '#059669',
    renderedX: 0.84,
    renderedY: 0.72,
    isFading: false,
  },
];

const meta = {
  title: 'Component Lib/Presence/CursorPresenceOverlay',
  component: CursorPresenceOverlay,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Absolute overlay for remote collaborator cursors. Stories render the overlay inside a bounded canvas so placement, fading, and label contrast are visible in Storybook.',
      },
    },
  },
  render: (args) => (
    <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-theme bg-gradient-to-br from-theme-elevated to-theme-subtle">
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-20">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="border border-theme/40" />
        ))}
      </div>
      <CursorPresenceOverlay {...args} />
    </div>
  ),
  args: {
    cursors: demoCursors,
  },
} satisfies Meta<typeof CursorPresenceOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ClampedEdgePositions: Story = {
  args: {
    cursors: [
      { ...demoCursors[0], renderedX: -0.2, renderedY: 1.2 },
      { ...demoCursors[1], renderedX: 1.15, renderedY: -0.1 },
    ],
  },
};
