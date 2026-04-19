import type { Meta, StoryObj } from '@storybook/react-vite';
import { DroppedStopsBanner } from './DroppedStopsBanner';
import type { Item } from '@/types/trip';

const meta = {
  title: 'Component Lib/Optimizer/DroppedStopsBanner',
  component: DroppedStopsBanner,
  tags: ['autodocs'],
  args: {
    items: [
      {
        item: {
          itemId: 'item-1',
          dayId: 'day-1',
          placeId: 'place-1',
          placeName: 'Art Institute of Chicago',
          lat: 41.8796,
          lng: -87.6237,
          address: '111 S Michigan Ave, Chicago, IL 60603',
          type: 'attraction',
          scheduledStart: '2026-05-12T09:00:00',
          scheduledEnd: '2026-05-12T11:00:00',
          durationMinutes: 120,
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
        reason: 'No availability window fits on this day',
      },
      {
        item: {
          itemId: 'item-2',
          dayId: 'day-1',
          placeId: 'place-2',
          placeName: 'Chicago Riverwalk',
          lat: 41.8873,
          lng: -87.6277,
          address: 'Chicago Riverwalk, Chicago, IL 60601',
          type: 'activity',
          scheduledStart: '2026-05-12T11:30:00',
          scheduledEnd: '2026-05-12T12:15:00',
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
        reason: 'Exceeds day end time',
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DroppedStopsBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
  },
};
