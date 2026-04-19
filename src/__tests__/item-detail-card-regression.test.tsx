import { fireEvent, render, screen } from '@testing-library/react';
import { ItemDetailCard } from '@/components/items/ItemDetailCard';
import type { Item } from '@/types/trip';

function createItem(overrides?: Partial<Item>): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'custom-origin',
    placeName: 'Museum',
    lat: 1,
    lng: 1,
    address: '1 Main St',
    type: 'activity',
    scheduledStart: '09:00',
    scheduledEnd: '10:00',
    durationMinutes: 60,
    notesMd: 'Original notes',
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

describe('ItemDetailCard editor synchronization', () => {
  it('keeps focused local notes when same-item props update underneath it', () => {
    const baseItem = createItem();
    const handleUpdate = vi.fn();

    const { rerender } = render(
      <ItemDetailCard item={baseItem} onUpdate={handleUpdate} embedded />,
    );

    const textarea = screen.getByPlaceholderText('Add notes') as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    fireEvent.change(textarea, { target: { value: 'Local draft that should stay put' } });
    expect(textarea.value).toBe('Local draft that should stay put');

    rerender(
      <ItemDetailCard
        item={createItem({
          durationMinutes: 75,
          scheduledEnd: '10:15',
        })}
        onUpdate={handleUpdate}
        embedded
      />,
    );

    expect(textarea.value).toBe('Local draft that should stay put');
    expect(document.activeElement).toBe(textarea);
  });
});
