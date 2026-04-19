import { fireEvent, render, screen } from '@testing-library/react';
import { ItemDetailCard } from '@route-lib/trip-workspace/ui/items/ItemDetailCard';
import type { Item } from '@/types/trip';

function createItem(overrides?: Partial<Item>): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'custom-place-1',
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

describe('ItemDetailCard draft sync', () => {
  it('keeps the focused local draft when the same item props echo back in', () => {
    const handleUpdate = vi.fn();
    const { rerender } = render(
      <ItemDetailCard item={createItem()} onUpdate={handleUpdate} embedded />,
    );

    const textarea = screen.getByPlaceholderText('Add notes') as HTMLTextAreaElement;
    textarea.focus();
    fireEvent.change(textarea, { target: { value: 'Local draft' } });

    expect(document.activeElement).toBe(textarea);
    expect(textarea.value).toBe('Local draft');

    rerender(
      <ItemDetailCard
        item={createItem({ notesMd: 'Server echo' })}
        onUpdate={handleUpdate}
        embedded
      />,
    );

    expect(document.activeElement).toBe(textarea);
    expect(textarea.value).toBe('Local draft');
  });

  it('accepts the latest same-item props again after focus leaves the editor', () => {
    const { rerender } = render(<ItemDetailCard item={createItem()} embedded />);

    const textarea = screen.getByPlaceholderText('Add notes') as HTMLTextAreaElement;
    textarea.focus();
    fireEvent.change(textarea, { target: { value: 'Local draft' } });
    textarea.blur();

    rerender(<ItemDetailCard item={createItem({ notesMd: 'Server final' })} embedded />);

    expect(textarea.value).toBe('Server final');
  });
});
