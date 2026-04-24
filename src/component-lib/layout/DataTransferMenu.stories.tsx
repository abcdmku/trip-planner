import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DataTransferMenu, type DataTransferMenuProps } from './DataTransferMenu';

const meta = {
  title: 'Component Lib/Layout/DataTransferMenu',
  component: DataTransferMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Profile menu controls for trip data export and JSON file loading. Route-lib adapters provide the actual file parsing and snapshot restore behavior.',
      },
    },
  },
  args: {
    status: 'idle',
    message: null,
    disabled: false,
    onExportData: fn(),
    onLoadData: fn(),
  },
  render: (args) => (
    <div className="w-72 rounded-theme-shell border border-theme bg-theme-elevated p-4 shadow-theme-lg">
      <DataTransferMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof DataTransferMenu>;

export default meta;

type Story = StoryObj<DataTransferMenuProps>;

export const Default: Story = {};

export const LoadingData: Story = {
  args: {
    status: 'loading',
  },
};

export const ExportSuccess: Story = {
  args: {
    status: 'success',
    message: 'Exported Pacific Coast Sprint.',
  },
};

export const ErrorState: Story = {
  args: {
    status: 'error',
    message: 'Choose a valid trip data JSON file.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const ExportInteraction: Story = {
  args: {
    onExportData: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /^export$/i }));

    await expect(args.onExportData).toHaveBeenCalledTimes(1);
  },
};

export const LoadInteraction: Story = {
  args: {
    onLoadData: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(['{"trip":{"id":"trip-1"},"days":[],"items":[],"legs":[]}'], 'trip-data.json', {
      type: 'application/json',
    });

    await expect(fileInput).not.toBeNull();
    await userEvent.upload(fileInput!, file);

    await expect(args.onLoadData).toHaveBeenCalledWith(file);
  },
};
