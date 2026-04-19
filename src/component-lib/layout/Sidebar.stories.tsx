import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Sidebar, type SidebarProps } from './Sidebar';

const baseArgs = {
  isOpen: true,
  onToggle: fn(),
  title: 'Itinerary',
  children: (
    <div className="space-y-3 p-4">
      {[
        { title: 'Blue Bottle Coffee', meta: '08:30 reservation' },
        { title: 'Museum transfer', meta: '15 min walk' },
        { title: 'Dinner shortlist', meta: '3 saved places' },
      ].map((item) => (
        <article
          key={item.title}
          className="rounded-2xl border border-theme bg-theme px-4 py-3 shadow-theme-sm"
        >
          <p className="text-sm font-semibold text-theme">{item.title}</p>
          <p className="text-xs text-theme-secondary">{item.meta}</p>
        </article>
      ))}
    </div>
  ),
} satisfies SidebarProps;

const meta = {
  title: 'Component Lib/Layout/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Controlled sidebar chrome for itinerary and supporting panels. Route-lib or app shell code should supply the open state and panel content explicitly.',
      },
    },
  },
  argTypes: {
    children: { control: false },
    onToggle: { control: false },
  },
  args: baseArgs,
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<SidebarProps>;

export const Open: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Saved Places',
  },
};

export const ToggleInteraction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: /close sidebar/i }));
    await expect(args.onToggle).toHaveBeenCalled();
  },
};
