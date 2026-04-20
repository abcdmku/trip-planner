import { fireEvent, render, screen } from '@testing-library/react';
import { ItemCard } from '@route-lib/trip-workspace/ui/items/ItemCard';
import type { Item } from '@/types/trip';

function createItem(overrides?: Partial<Item>): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Museum',
    lat: 1,
    lng: 1,
    address: '1 Main St',
    type: 'activity',
    scheduledStart: '09:00',
    scheduledEnd: '10:00',
    durationMinutes: 60,
    notesMd: '',
    photoUrls: [],
    availabilityWindows: '[]',
    isOptional: false,
    priority: 0,
    sortOrder: 0,
    destLat: 0,
    destLng: 0,
    destName: '',
    destAddress: '',
    transportMode: 'walking',
    itemRouteType: 'directions',
    itemRoutePathEncoded: '',
    itemRouteDistanceMeters: 0,
    itemRouteDurationMinutes: 0,
    timelineLocked: false,
    travelFromItemId: '',
    travelToItemId: '',
    ...overrides,
  };
}

describe('ItemCard', () => {
  it('deletes the side-panel item when Delete is pressed on the focused card', () => {
    const handleDelete = vi.fn();

    render(<ItemCard item={createItem()} onDelete={handleDelete} onClick={() => undefined} />);

    const card = screen.getByText('Museum').closest('[role="button"]');
    expect(card).not.toBeNull();

    card?.focus();
    fireEvent.keyDown(card as HTMLElement, { key: 'Delete' });

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('clicking the delete action does not bubble into the card click handler', () => {
    const handleDelete = vi.fn();
    const handleClick = vi.fn();

    render(<ItemCard item={createItem()} onDelete={handleDelete} onClick={handleClick} />);

    fireEvent.click(screen.getByLabelText('Delete item'));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders selected-day display times without repeating the timezone on every card', () => {
    render(
      <ItemCard
        item={createItem({
          placeName: 'Overnight Train',
          scheduledStart: '23:30',
          scheduledEnd: '23:59',
          durationMinutes: 180,
        })}
        displayItem={createItem({
          placeName: 'Overnight Train',
          scheduledStart: '00:30',
          scheduledEnd: '03:30',
          durationMinutes: 180,
        })}
        timezoneLabel="EDT"
      />,
    );

    expect(screen.getByText('12:30a - 3:30a')).toBeTruthy();
    expect(screen.queryByText('12:30a - 3:30a EDT')).toBeNull();
  });
});
