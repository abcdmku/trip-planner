import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimezoneBadge } from './TimezoneBadge';

const meta = {
  title: 'Component Lib/Timezone/TimezoneBadge',
  component: TimezoneBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Timezone label used across trip-aware views. Stories cover compact 3-letter badges, alternate timezones, and the optional full-name display.',
      },
    },
  },
  render: (args) => (
    <div className="min-h-[120px] bg-theme p-6">
      <TimezoneBadge {...args} />
    </div>
  ),
  args: {
    timezone: 'America/Chicago',
    baseTimezone: 'America/Chicago',
    date: '2026-05-13',
    showFull: false,
  },
} satisfies Meta<typeof TimezoneBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Local: Story = {};

export const DifferentTimezone: Story = {
  args: {
    timezone: 'America/New_York',
    baseTimezone: 'America/Chicago',
  },
};

export const FullName: Story = {
  args: {
    timezone: 'America/Los_Angeles',
    baseTimezone: 'America/Chicago',
    showFull: true,
  },
};
