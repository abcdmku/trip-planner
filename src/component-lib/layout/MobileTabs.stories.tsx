import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MobileTabs } from './MobileTabs';
import { mobileStoryGlobals } from '@/storybook/viewports';

type MobileTabsProps = ComponentProps<typeof MobileTabs>;

const tabLabels: Record<MobileTabsProps['activeTab'], string> = {
  map: 'Map',
  itinerary: 'Itinerary',
  timeline: 'Timeline',
  optimize: 'Optimize',
};

const tabDescriptions: Record<MobileTabsProps['activeTab'], string> = {
  map: 'Spatial trip view with location clustering and route context.',
  itinerary: 'List-based planning view for quick edits and reordering.',
  timeline: 'Time-based schedule view for pacing the day.',
  optimize: 'Optimization workspace for sequencing and balancing stops.',
};

function MobileTabsStoryHarness({
  activeTab,
  onTabChange,
}: MobileTabsProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  return (
    <div
      data-mobile-tabs-story
      className="min-h-[720px] bg-theme text-theme-primary"
    >
      <main
        id="main-content"
        className="mx-auto flex min-h-[720px] w-full max-w-sm flex-col gap-4 px-4 py-6 pb-28"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-tertiary">
            Mobile navigation
          </p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{tabLabels[currentTab]}</h1>
            <p className="text-sm text-theme-secondary">
              {tabDescriptions[currentTab]}
            </p>
          </div>
        </header>

        <section className="grid gap-3">
          <article className="rounded-2xl border border-theme bg-theme-elevated p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Current view</h2>
            <p className="mt-2 text-sm text-theme-secondary">
              The selected tab controls which workspace is currently visible on
              small screens.
            </p>
          </article>
          <article className="rounded-2xl border border-theme bg-theme-elevated p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Storybook note</h2>
            <p className="mt-2 text-sm text-theme-secondary">
              This story keeps the fixed mobile-only bar visible so its states
              remain reviewable in a dedicated mobile Storybook canvas.
            </p>
          </article>
        </section>
      </main>

      <MobileTabs
        activeTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          onTabChange(tab);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Component Lib/Layout/MobileTabs',
  component: MobileTabs,
  tags: ['autodocs'],
  globals: mobileStoryGlobals,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Fixed mobile tab bar for switching between the primary planner workspaces. Stories lock a mobile viewport so the responsive `md:hidden` navigation renders in its real mobile state.',
      },
    },
  },
  argTypes: {
    activeTab: {
      control: 'inline-radio',
      options: ['map', 'itinerary', 'timeline', 'optimize'],
    },
    onTabChange: {
      control: false,
    },
  },
  args: {
    activeTab: 'map',
    onTabChange: fn(),
  },
  render: (args) => <MobileTabsStoryHarness {...args} />,
} as Meta<typeof MobileTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ItineraryActive: Story = {
  args: {
    activeTab: 'itinerary',
  },
};

export const TimelineActive: Story = {
  args: {
    activeTab: 'timeline',
  },
};

export const OptimizeActive: Story = {
  args: {
    activeTab: 'optimize',
  },
};

export const InteractiveNavigation: Story = {
  args: {
    onTabChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mapTab = canvas.getByRole('tab', { name: 'Map' });
    const timelineTab = canvas.getByRole('tab', { name: 'Timeline' });

    await userEvent.click(timelineTab);

    await expect(mapTab).toHaveAttribute('aria-selected', 'false');
    await expect(timelineTab).toHaveAttribute('aria-selected', 'true');
  },
};
