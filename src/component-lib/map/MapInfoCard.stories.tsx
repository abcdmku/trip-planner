import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MapInfoCard } from './MapInfoCard';
import {
  createItemFixture,
  createPlaceSearchResultFixture,
} from '@/component-lib/story-support/trip-fixtures';

const closeSpy = fn();
const addSpy = fn();
const editSpy = fn();
const deleteSpy = fn();

const place = createPlaceSearchResultFixture({
  name: 'Chicago Cultural Center',
  address: '78 E Washington St, Chicago, IL 60602',
  rating: 4.8,
  userRatingsTotal: 3421,
  priceLevel: 2,
  openNow: true,
  phoneNumber: '(312) 744-6630',
  website: 'https://www.chicago.gov',
  googleMapsUrl: 'https://maps.google.com',
  editorialSummary: 'Historic landmark with free exhibitions, a dramatic dome, and public performances.',
  weekdayText: ['Monday: 10:00 AM - 5:00 PM', 'Tuesday: 10:00 AM - 5:00 PM'],
});

const meta = {
  title: 'Map/MapInfoCard',
  component: MapInfoCard,
  tags: ['autodocs'],
  args: {
    place,
    item: null,
    isLoading: false,
    error: null,
    onClose: closeSpy,
    onAddToItinerary: addSpy,
    onEditItem: editSpy,
    onDeleteItem: deleteSpy,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-start justify-center bg-theme-subtle p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapInfoCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
    place: null,
  },
};

export const ErrorState: Story = {
  args: {
    place: null,
    error: 'Place details are unavailable for this location.',
  },
};

export const ItineraryItem: Story = {
  args: {
    item: createItemFixture({
      type: 'activity',
      placeName: 'Architecture boat tour',
      scheduledStart: '2026-05-12T10:00:00.000Z',
      scheduledEnd: '2026-05-12T11:30:00.000Z',
      durationMinutes: 90,
    }),
  },
};

export const InteractiveActions: Story = {
  play: async ({ canvasElement }) => {
    closeSpy.mockClear();
    addSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add to itinerary' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));

    await expect(addSpy).toHaveBeenCalledTimes(1);
    await expect(closeSpy).toHaveBeenCalledTimes(1);
  },
};
