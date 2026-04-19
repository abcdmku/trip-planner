import type { Meta, StoryObj } from '@storybook/react-vite';
import { OptimizePreview } from './OptimizePreview';
import type { Item, Leg } from '@/types/trip';
import type { OptimizeResult } from '@/services/optimizer-service';

const result: OptimizeResult = {
  orderedItems: [
    {
      itemId: 'item-1',
      dayId: 'day-1',
      placeId: 'place-1',
      placeName: 'Art Institute of Chicago',
      lat: 41.8796,
      lng: -87.6237,
      address: '111 S Michigan Ave, Chicago, IL 60603',
      type: 'attraction',
      scheduledStart: '2026-05-12T09:00:00',
      scheduledEnd: '2026-05-12T10:30:00',
      durationMinutes: 90,
      notesMd: '',
      photoUrls: [],
      availabilityWindows: '[]',
      isOptional: false,
      priority: 1,
      sortOrder: 0,
      destLat: 0,
      destLng: 0,
      destName: '',
      destAddress: '',
      transportMode: 'walking',
      itemRouteType: 'straight',
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
      timelineLocked: false,
      travelFromItemId: '',
      travelToItemId: '',
    } satisfies Item,
    {
      itemId: 'item-2',
      dayId: 'day-1',
      placeId: 'place-2',
      placeName: 'Chicago Riverwalk',
      lat: 41.8873,
      lng: -87.6277,
      address: 'Chicago Riverwalk, Chicago, IL 60601',
      type: 'activity',
      scheduledStart: '2026-05-12T11:15:00',
      scheduledEnd: '2026-05-12T12:00:00',
      durationMinutes: 45,
      notesMd: '',
      photoUrls: [],
      availabilityWindows: '[]',
      isOptional: false,
      priority: 1,
      sortOrder: 1,
      destLat: 0,
      destLng: 0,
      destName: '',
      destAddress: '',
      transportMode: 'walking',
      itemRouteType: 'straight',
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
      timelineLocked: false,
      travelFromItemId: '',
      travelToItemId: '',
    } satisfies Item,
  ],
  droppedItems: [],
  legs: [
    {
      legId: 'leg-1',
      fromItemId: 'item-1',
      toItemId: 'item-2',
      mode: 'walking',
      departure: '2026-05-12T10:30:00.000Z',
      arrival: '2026-05-12T10:45:00.000Z',
      durationMinutes: 15,
      distanceMeters: 1200,
      routePathEncoded: '',
      routeType: 'directions',
    } satisfies Leg,
  ],
  totalTravelMinutes: 15,
};

const meta = {
  title: 'Component Lib/Optimizer/OptimizePreview',
  component: OptimizePreview,
  tags: ['autodocs'],
  args: {
    result,
    mode: 'maximize',
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OptimizePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MinimizeMode: Story = {
  args: {
    mode: 'minimize',
  },
};
