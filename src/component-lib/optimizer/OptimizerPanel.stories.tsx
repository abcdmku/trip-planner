import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { OptimizerPanel } from './OptimizerPanel';
import type { Day, Item } from '@/types/trip';
import type { OptimizeResult } from '@/services/optimizer-service';

const selectedDay = {
  dayId: 'day-1',
  label: 'Arrival Day',
  date: '2026-05-12',
  colorHex: '#F59E0B',
  dayStart: '08:00',
  dayEnd: '22:00',
  timezone: 'America/Chicago',
} satisfies Day;

const previewResult: OptimizeResult = {
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
  droppedItems: [
    {
      item: {
        itemId: 'item-3',
        dayId: 'day-1',
        placeId: 'place-3',
        placeName: 'Navy Pier',
        lat: 41.8917,
        lng: -87.6078,
        address: '600 E Grand Ave, Chicago, IL 60611',
        type: 'activity',
        scheduledStart: '2026-05-12T13:00:00',
        scheduledEnd: '2026-05-12T14:00:00',
        durationMinutes: 60,
        notesMd: '',
        photoUrls: [],
        availabilityWindows: '[]',
        isOptional: false,
        priority: 1,
        sortOrder: 2,
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
  legs: [],
  totalTravelMinutes: 15,
};

const optimizeSpy = fn();
const applySpy = fn();
const clearSpy = fn();

const meta = {
  title: 'Component Lib/Optimizer/OptimizerPanel',
  component: OptimizerPanel,
  tags: ['autodocs'],
  args: {
    selectedDay,
    isOptimizing: false,
    previewResult: null,
    onOptimize: optimizeSpy,
    onApply: applySpy,
    onClear: clearSpy,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl bg-theme p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OptimizerPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSelectedDay: Story = {
  args: {
    selectedDay: undefined,
  },
};

export const ReadyToOptimize: Story = {};

export const WithPreview: Story = {
  args: {
    previewResult,
  },
};

export const MinimizeFlow: Story = {
  args: {
    previewResult,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Min Travel' }));
    await expect(canvas.getByText('Optimized route saves travel time')).toBeInTheDocument();
  },
};
