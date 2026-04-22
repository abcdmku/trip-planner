import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DateInput } from './DateInput';

const meta = {
  title: 'Component Lib/Shared/DateInput',
  component: DateInput,
  tags: ['autodocs'],
  args: {
    id: 'storybook-date-input',
    value: '2026-05-12',
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <div className="max-w-xs">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Shared date field primitive for compact mobile-safe forms. Keeps native date input behavior while standardizing spacing and the leading calendar affordance.',
      },
    },
  },
} satisfies Meta<typeof DateInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    value: '',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
