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
    day: {
      date: '2026-05-12',
      timezone: 'America/Chicago',
    },
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

export const SelectedDayTimezone: Story = {
  args: {
    item: createItemFixture({
      itemId: 'item-overnight-origin',
      type: 'transport',
      placeName: 'Overnight Train',
      scheduledStart: '23:30',
      scheduledEnd: '23:59',
      durationMinutes: 180,
    }),
    displayItem: createItemFixture({
      itemId: 'item-overnight-origin',
      type: 'transport',
      placeName: 'Overnight Train',
      scheduledStart: '00:30',
      scheduledEnd: '03:30',
      durationMinutes: 180,
    }),
    day: {
      date: '2026-05-13',
      timezone: 'America/New_York',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('12:30 AM - 3:30 AM EDT')).toBeInTheDocument();
    await expect(canvas.getByText('Hours of operation - EDT')).toBeInTheDocument();
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
