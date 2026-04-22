import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PhotoGallery } from './PhotoGallery';

const previewImageUrls = [
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
];

const meta = {
  title: 'Component Lib/Shared/PhotoGallery',
  component: PhotoGallery,
  tags: ['autodocs'],
  args: {
    altBase: 'Chicago Cultural Center',
    urls: previewImageUrls,
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-theme p-6">
        <div className="max-w-sm">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Shared image gallery primitive for compact cards. Renders a single active preview image with centered pagination dots when multiple images are available.',
      },
    },
  },
} satisfies Meta<typeof PhotoGallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MultipleImages: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('img', { name: 'Chicago Cultural Center image 1' }),
    ).toBeInTheDocument();

    await userEvent.hover(canvas.getByRole('img', { name: 'Chicago Cultural Center image 1' }));
    await expect(canvas.getByRole('button', { name: 'Next image' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Next image' }));

    await expect(
      canvas.getByRole('img', { name: 'Chicago Cultural Center image 2' }),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Previous image' }));

    await expect(
      canvas.getByRole('img', { name: 'Chicago Cultural Center image 1' }),
    ).toBeInTheDocument();
  },
};

export const SingleImage: Story = {
  args: {
    urls: [previewImageUrls[0]],
  },
};

export const Empty: Story = {
  args: {
    urls: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole('img')).toHaveLength(0);
  },
};
