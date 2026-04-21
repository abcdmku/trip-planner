import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { MockMapsRepositoryBoundary } from '@/component-lib/story-support/maps-mocks';
import { createPlaceSearchResultFixture } from '@/component-lib/story-support/trip-fixtures';
import {
  ItemRouteEditorHeaderActions,
  ItemRouteEditorSection,
} from './ItemRouteEditorSection';

const museum = createPlaceSearchResultFixture({
  placeId: 'place-art-museum',
  name: 'Art Institute of Chicago',
  address: '111 S Michigan Ave, Chicago, IL 60603',
  lat: 41.8796,
  lng: -87.6237,
  types: ['museum', 'tourist_attraction'],
});

const riverwalk = createPlaceSearchResultFixture({
  placeId: 'place-riverwalk',
  name: 'Chicago Riverwalk',
  address: 'Chicago Riverwalk, Chicago, IL 60601',
  lat: 41.8873,
  lng: -87.6277,
  types: ['tourist_attraction', 'park'],
});

const longDestination = createPlaceSearchResultFixture({
  placeId: 'place-long-destination',
  name: 'Chicago Riverwalk East Access at the Centennial Fountain',
  address: '401 E Lower Wacker Dr, Chicago, IL 60601, United States',
  lat: 41.8869,
  lng: -87.6204,
  types: ['tourist_attraction', 'park'],
});

const customPin = createPlaceSearchResultFixture({
  placeId: 'custom-pin',
  name: '',
  address: '41.891700, -87.607800',
  lat: 41.8917,
  lng: -87.6078,
  types: [],
});

const toggleSpy = fn();

function renderRouteEditor(args: any, widthClass = 'max-w-[660px]') {
  return (
    <MockMapsRepositoryBoundary
      options={{
        searchResults: [museum, riverwalk, longDestination],
        placeDetailsById: {
          [museum.placeId]: museum,
          [riverwalk.placeId]: riverwalk,
          [longDestination.placeId]: longDestination,
        },
        legCalculation: {
          departure: '2026-05-12T09:00:00.000Z',
          arrival: '2026-05-12T09:18:00.000Z',
          durationMinutes: 18,
          distanceMeters: 1450,
          routePathEncoded: 'mock-encoded-path',
        },
      }}
    >
      <div className="min-h-screen bg-theme p-6">
        <div className={widthClass}>
          <ItemRouteEditorSection {...args} />
        </div>
      </div>
    </MockMapsRepositoryBoundary>
  );
}

const meta = {
  title: 'Route Lib/Trip Workspace/Items/ItemRouteEditorSection',
  component: ItemRouteEditorSection,
  tags: ['autodocs'],
  args: {
    selectedPlace: museum,
    destinationPlace: riverwalk,
    editorValue: {
      type: 'transport',
      transportMode: 'walking',
      itemRouteType: 'directions',
      scheduledStart: '09:00',
      scheduledEnd: '09:30',
      durationMinutes: 30,
      notesMd: '',
      availabilityWindows: '[]',
      timelineLocked: false,
    },
    routeBadge: 'Walk / Routed / 18m',
    showTravelControls: true,
    canCalculateRoute: true,
    hasCalculatedRoute: true,
    travelDurationMinutes: 18,
    isCalculatingRoute: false,
    openInGoogleMapsUrl: 'https://maps.google.com',
    isEditingOrigin: false,
    isEditingDestination: false,
    onToggle: fn(),
    onOriginEditStart: fn(),
    onOriginEditCancel: fn(),
    onDestinationEditStart: fn(),
    onDestinationEditCancel: fn(),
    onOriginSelect: fn(),
    onDestinationSelect: fn(),
    onOriginClear: fn(),
    onDestinationClear: fn(),
    onCustomOriginNameChange: fn(),
    onRouteChange: fn(),
    onCalculateRoute: fn(),
  },
  argTypes: {
    headerActions: { control: false },
    onToggle: { control: false },
    onOriginEditStart: { control: false },
    onOriginEditCancel: { control: false },
    onDestinationEditStart: { control: false },
    onDestinationEditCancel: { control: false },
    onOriginSelect: { control: false },
    onDestinationSelect: { control: false },
    onOriginClear: { control: false },
    onDestinationClear: { control: false },
    onCustomOriginNameChange: { control: false },
    onRouteChange: { control: false },
    onCalculateRoute: { control: false },
  },
  render: (args) => renderRouteEditor(args),
} satisfies Meta<typeof ItemRouteEditorSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ExpandedDefault: Story = {};

export const CollapsedSummary: Story = {
  args: {
    collapsible: true,
    isOpen: false,
    onToggle: toggleSpy,
  },
  play: async ({ canvasElement }) => {
    toggleSpy.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /travel setup/i }));

    await expect(toggleSpy).toHaveBeenCalledTimes(1);
  },
};

export const EmptyAddState: Story = {
  args: {
    selectedPlace: null,
    destinationPlace: null,
    routeBadge: 'Drive / Straight',
    showTravelControls: false,
    canCalculateRoute: false,
    hasCalculatedRoute: false,
    travelDurationMinutes: 0,
  },
};

export const CustomPinNeedsName: Story = {
  args: {
    selectedPlace: customPin,
    destinationPlace: null,
    customOriginName: '',
    isCustomOrigin: true,
    allowCustomOriginName: true,
    allowOriginClear: true,
    routeBadge: 'Drive / Straight',
    showTravelControls: false,
    canCalculateRoute: false,
    hasCalculatedRoute: false,
    travelDurationMinutes: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('Location name')).toBeInTheDocument();
  },
};

export const EditableCardChrome: Story = {
  args: {
    compact: true,
    headerSummaryVariant: 'hidden',
    dayColor: '#0EA5E9',
    locationCardMode: 'clickable-card',
    destinationEmptyMode: 'cta-card',
    allowDestinationClear: true,
    headerActions: <ItemRouteEditorHeaderActions onDelete={fn()} onClose={fn()} />,
  },
  render: (args) => renderRouteEditor(args, 'max-w-[420px]'),
};

export const FirstClassCompact: Story = {
  args: {
    compact: true,
    surfaceStyle: 'plain',
    title: undefined,
    subtitle: undefined,
    headerSummaryVariant: 'hidden',
    dayColor: '#0EA5E9',
    locationCardMode: 'clickable-card',
    destinationEmptyMode: 'cta-card',
    allowDestinationClear: true,
  },
  render: (args) => renderRouteEditor(args, 'max-w-[420px]'),
};

export const CalculatingRoute: Story = {
  args: {
    isCalculatingRoute: true,
    travelDurationMinutes: 0,
    hasCalculatedRoute: false,
  },
};

export const NarrowHeaderStress: Story = {
  args: {
    selectedPlace: {
      ...museum,
      name: 'Museum Campus Arrival Plaza and Public Garden Entrance',
      address: '111 South Michigan Avenue, Chicago, Illinois 60603, United States',
    },
    destinationPlace: longDestination,
    routeBadge: 'Walk / Routed / 18m with transfer hold',
    headerSummaryVariant: 'text',
    headerActions: <ItemRouteEditorHeaderActions onDelete={fn()} onClose={fn()} />,
    allowDestinationClear: true,
  },
  render: (args) => renderRouteEditor(args, 'max-w-[360px]'),
};

export const EditingDestination: Story = {
  args: {
    destinationPlace: null,
    isEditingDestination: true,
    destinationEmptyMode: 'cta-card',
  },
  render: (args) => renderRouteEditor(args, 'max-w-[480px]'),
};
