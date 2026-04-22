import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AddItemDialog } from './AddItemDialog';
import { MockMapsRepositoryBoundary } from '@/component-lib/story-support/maps-mocks';
import { createPlaceSearchResultFixture } from '@/component-lib/story-support/trip-fixtures';
import { mobileStoryGlobals } from '@/storybook/viewports';

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

const addItemSpy = fn();
type AddItemDialogStoryArgs = Parameters<typeof AddItemDialog>[0];

function renderDialog(
  args: AddItemDialogStoryArgs,
  heightClass = 'min-h-screen',
) {
  return (
    <MockMapsRepositoryBoundary
      options={{
        searchResults: [museum, riverwalk],
        placeDetailsById: {
          [museum.placeId]: museum,
          [riverwalk.placeId]: riverwalk,
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
      <div className={`${heightClass} bg-theme p-6`}>
        <AddItemDialog {...args} />
      </div>
    </MockMapsRepositoryBoundary>
  );
}

const meta = {
  title: 'Items/AddItemDialog',
  component: AddItemDialog,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onAdd: fn(),
    defaultDate: '2026-05-12',
    defaultTimezoneLabel: 'CDT',
    isSubmitting: false,
  },
  render: (args) => renderDialog(args),
} satisfies Meta<typeof AddItemDialog>;

export default meta;

type Story = StoryObj<typeof AddItemDialog>;

export const Default: Story = {
  args: {
    initialPlace: museum,
  },
};

export const CustomTitleSubmit: Story = {
  args: {
    initialPlace: museum,
    onAdd: addItemSpy,
  },
  play: async ({ canvasElement }) => {
    addItemSpy.mockClear();

    const canvas = within(canvasElement);
    const titleInput = canvas.getByLabelText('Title');

    await expect(titleInput).toHaveValue(museum.name);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Museum lunch');
    await userEvent.click(canvas.getByRole('button', { name: 'Add Event to Itinerary' }));

    await expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        placeName: 'Museum lunch',
      }),
    );
  },
};

export const SelectedDayTimezone: Story = {
  args: {
    initialPlace: museum,
    defaultTimezoneLabel: 'EDT',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('EDT')).toHaveLength(1);
  },
};

export const EmptyState: Story = {};

export const Submitting: Story = {
  args: {
    initialPlace: museum,
    initialDestination: riverwalk,
    isSubmitting: true,
  },
};

export const WithRouteCalculation: Story = {
  args: {
    initialPlace: museum,
    initialDestination: riverwalk,
    initialType: 'transport',
    initialTransportMode: 'walking',
    initialRouteType: 'directions',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /calculate/i }));

    await expect(await canvas.findByText('18 min')).toBeInTheDocument();
  },
};

export const CustomPinRequiresName: Story = {
  args: {
    initialLocation: { lat: 41.8917, lng: -87.6078 },
    onAdd: addItemSpy,
  },
  play: async ({ canvasElement }) => {
    addItemSpy.mockClear();

    const canvas = within(canvasElement);
    const submitButton = canvas.getByRole('button', { name: 'Add Event to Itinerary' });

    await expect(submitButton).toBeDisabled();

    await userEvent.type(canvas.getByLabelText('Location name'), 'Lakefront overlook');
    await userEvent.click(submitButton);

    await expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        placeName: 'Lakefront overlook',
        lat: 41.8917,
        lng: -87.6078,
      }),
    );
  },
};

export const CompactViewport = {
  args: {
    initialPlace: museum,
    initialDestination: riverwalk,
    initialType: 'transport',
    initialTransportMode: 'walking',
    initialRouteType: 'directions',
  },
  globals: mobileStoryGlobals,
  render: (args: AddItemDialogStoryArgs) => renderDialog(args, 'min-h-[760px]'),
} as Story;
