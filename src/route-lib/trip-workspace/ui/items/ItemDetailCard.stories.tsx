import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ItemDetailCard } from './ItemDetailCard';
import { MockMapsRepositoryBoundary } from '@/component-lib/story-support/maps-mocks';
import {
  createItemFixture,
  createPlaceSearchResultFixture,
} from '@/component-lib/story-support/trip-fixtures';

const originPlace = createPlaceSearchResultFixture({
  placeId: 'place-art-museum',
  name: 'Art Institute of Chicago',
  address: '111 S Michigan Ave, Chicago, IL 60603',
  lat: 41.8796,
  lng: -87.6237,
  types: ['museum', 'tourist_attraction'],
});

const destinationPlace = createPlaceSearchResultFixture({
  placeId: 'place-riverwalk',
  name: 'Chicago Riverwalk',
  address: 'Chicago Riverwalk, Chicago, IL 60601',
  lat: 41.8873,
  lng: -87.6277,
  types: ['tourist_attraction', 'park'],
});

const routedItem = createItemFixture({
  placeId: originPlace.placeId,
  placeName: originPlace.name,
  address: originPlace.address,
  lat: originPlace.lat,
  lng: originPlace.lng,
  destLat: destinationPlace.lat,
  destLng: destinationPlace.lng,
  destName: destinationPlace.name,
  destAddress: destinationPlace.address,
  transportMode: 'walking',
  itemRouteType: 'directions',
  itemRouteDurationMinutes: 12,
  itemRouteDistanceMeters: 950,
});
const itemDetailUpdateSpy = fn();

const meta = {
  title: 'Items/ItemDetailCard',
  component: ItemDetailCard,
  tags: ['autodocs'],
  args: {
    item: routedItem,
    dayColor: '#0EA5E9',
    dayDate: '2026-05-12',
    dayTimezoneLabel: 'CDT',
    onUpdate: fn(),
    onDelete: fn(),
    onClose: fn(),
  },
  render: (args) => (
    <MockMapsRepositoryBoundary
      options={{
        searchResults: [originPlace, destinationPlace],
        placeDetailsById: {
          [originPlace.placeId]: originPlace,
          [destinationPlace.placeId]: destinationPlace,
        },
        legCalculation: {
          departure: '2026-05-12T14:00:00.000Z',
          arrival: '2026-05-12T14:18:00.000Z',
          durationMinutes: 18,
          distanceMeters: 1450,
          routePathEncoded: 'mock-encoded-path',
        },
      }}
    >
      <div className="max-w-xl bg-theme p-6">
        <ItemDetailCard {...args} />
      </div>
    </MockMapsRepositoryBoundary>
  ),
} satisfies Meta<typeof ItemDetailCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SelectedDayTimezone: Story = {
  args: {
    dayTimezoneLabel: 'EDT',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('EDT')).toHaveLength(1);
  },
};

export const Compact: Story = {
  args: {
    density: 'compact',
  },
};

export const Embedded: Story = {
  args: {
    embedded: true,
    onClose: undefined,
  },
};

export const NoDestination: Story = {
  args: {
    item: createItemFixture({
      placeId: originPlace.placeId,
      placeName: originPlace.name,
      address: originPlace.address,
      lat: originPlace.lat,
      lng: originPlace.lng,
      destLat: 0,
      destLng: 0,
      destName: '',
      destAddress: '',
      itemRouteType: 'straight',
      itemRouteDurationMinutes: 0,
    }),
  },
};

export const RecalculatesRoute: Story = {
  args: {
    item: createItemFixture({
      placeId: originPlace.placeId,
      placeName: originPlace.name,
      address: originPlace.address,
      lat: originPlace.lat,
      lng: originPlace.lng,
      destLat: destinationPlace.lat,
      destLng: destinationPlace.lng,
      destName: destinationPlace.name,
      destAddress: destinationPlace.address,
      transportMode: 'walking',
      itemRouteType: 'directions',
      itemRouteDurationMinutes: 0,
      itemRouteDistanceMeters: 0,
    }),
    onUpdate: itemDetailUpdateSpy,
  },
  play: async ({ canvasElement }) => {
    itemDetailUpdateSpy.mockClear();

    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Calculate travel time' }));

    await expect(await canvas.findByText('18 min')).toBeInTheDocument();
    await expect(itemDetailUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        itemRouteDurationMinutes: 18,
        itemRouteDistanceMeters: 1450,
        itemRoutePathEncoded: 'mock-encoded-path',
      }),
    );
  },
};
