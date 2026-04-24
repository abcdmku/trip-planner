import type { Meta, StoryObj } from '@storybook/react-vite';
import { TripPlannerLogo, type TripPlannerLogoProps } from './TripPlannerLogo';

function renderLogo(args: TripPlannerLogoProps) {
  const widthClassName = args.variant === 'mark' ? 'w-20' : 'w-full max-w-sm';

  return (
    <div className="flex min-h-[18rem] items-center justify-center bg-theme p-8">
      <TripPlannerLogo {...args} className={widthClassName} />
    </div>
  );
}

const meta = {
  title: 'Component Lib/Shared/TripPlannerLogo',
  component: TripPlannerLogo,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Theme-aware Trip Planner brand asset with a softened terrain layer for light and dark surfaces. Use the full lockup on landing surfaces and the mark variant where space is constrained, such as favicon-adjacent or navigation affordances.',
      },
    },
  },
  args: {
    variant: 'full',
    title: 'Trip Planner',
  },
  render: (args) => renderLogo(args),
} satisfies Meta<typeof TripPlannerLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullLockup: Story = {};

export const IconMark: Story = {
  args: {
    variant: 'mark',
    title: 'Trip Planner mark',
  },
};

export const DarkLockup: Story = {
  args: {
    variant: 'full',
    title: 'Trip Planner',
  },
  globals: {
    theme: 'dark',
  },
} as Story;

export const DarkMark: Story = {
  args: {
    variant: 'mark',
    title: 'Trip Planner mark',
  },
  globals: {
    theme: 'dark',
  },
} as Story;

export const ThemeComparison: Story = {
  render: (args) => (
    <div className="grid min-h-[22rem] grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-8 bg-theme p-8 text-theme">
        <TripPlannerLogo
          {...args}
          variant="full"
          decorative
          className="w-full max-w-sm"
        />
        <TripPlannerLogo
          {...args}
          variant="mark"
          decorative
          className="h-20 w-16"
        />
      </div>
      <div className="dark flex flex-col items-center justify-center gap-8 bg-theme p-8 text-theme">
        <TripPlannerLogo
          {...args}
          variant="full"
          decorative
          className="w-full max-w-sm"
        />
        <TripPlannerLogo
          {...args}
          variant="mark"
          decorative
          className="h-20 w-16"
        />
      </div>
    </div>
  ),
};
