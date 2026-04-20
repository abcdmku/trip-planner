import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { VerticalTimeline } from '@route-lib/trip-workspace/ui/timeline/VerticalTimeline';
import type { Day, Item } from '@/types/trip';

function createDay(dayId: string, date: string, label: string, colorHex: string): Day {
  return {
    dayId,
    date,
    label,
    colorHex,
    dayStart: '08:00',
    dayEnd: '22:00',
    timezone: 'America/Chicago',
  };
}

const days = [
  createDay('day-1', '2026-04-18', 'Day 1', '#2563EB'),
  createDay('day-2', '2026-04-19', 'Day 2', '#16A34A'),
  createDay('day-3', '2026-04-20', 'Day 3', '#F59E0B'),
];

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    itemId: 'item-1',
    dayId: 'day-1',
    placeId: 'place-1',
    placeName: 'Museum',
    lat: 0,
    lng: 0,
    address: '',
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

describe('VerticalTimeline', () => {
  const originalScrollTo = HTMLElement.prototype.scrollTo;
  const scrollToMock = vi.fn();

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: originalScrollTo,
      writable: true,
    });
  });

  beforeEach(() => {
    scrollToMock.mockClear();
  });

  it('keeps multi-day mode active when a single day is selected from the top tabs', async () => {
    const handleViewportChange = vi.fn();
    const { container, rerender } = render(
      <VerticalTimeline
        items={[]}
        days={days}
        selectedDayIds={[]}
        onViewportChange={handleViewportChange}
      />,
    );

    await waitFor(() => {
      expect(handleViewportChange).toHaveBeenCalledWith(
        expect.objectContaining({
          viewMode: 'multi',
          focusedDayId: 'day-1',
        }),
      );
    });

    handleViewportChange.mockClear();

    rerender(
      <VerticalTimeline
        items={[]}
        days={days}
        selectedDayIds={['day-2']}
        onViewportChange={handleViewportChange}
      />,
    );

    await waitFor(() => {
      expect(handleViewportChange).toHaveBeenCalledWith(
        expect.objectContaining({
          viewMode: 'multi',
          focusedDayId: 'day-2',
        }),
      );
    });

    expect(container.querySelector('[data-timeline-scroller]')).not.toBeNull();
  });

  it('aligns a clicked multi-day column flush with the viewport', async () => {
    const { container } = render(
      <VerticalTimeline
        items={[]}
        days={days}
        selectedDayIds={[]}
      />,
    );

    const scroller = container.querySelector('[data-timeline-scroller]') as HTMLDivElement | null;
    const dayThreeColumn = container.querySelector('[data-day-column-id="day-3"]') as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(dayThreeColumn).not.toBeNull();
    if (!scroller || !dayThreeColumn) return;
    const dayThreeHeader = dayThreeColumn.querySelector('button');
    expect(dayThreeHeader).not.toBeNull();
    if (!dayThreeHeader) return;

    Object.defineProperty(scroller, 'scrollLeft', {
      configurable: true,
      value: 24,
      writable: true,
    });
    Object.defineProperty(scroller, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(scroller, 'scrollWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(scroller, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 360,
        bottom: 500,
        width: 360,
        height: 500,
        toJSON: () => undefined,
      }),
    });
    Object.defineProperty(dayThreeColumn, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 260,
        y: 0,
        left: 260,
        top: 0,
        right: 460,
        bottom: 500,
        width: 200,
        height: 500,
        toJSON: () => undefined,
      }),
    });

    scrollToMock.mockClear();
    fireEvent.click(dayThreeHeader);

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        left: 232,
        behavior: 'smooth',
      });
    });
  });

  it('reveals the selected day again when a repeat reveal request is sent', async () => {
    const { container, rerender } = render(
      <VerticalTimeline
        items={[]}
        days={days}
        selectedDayIds={['day-3']}
      />,
    );

    const scroller = container.querySelector('[data-timeline-scroller]') as HTMLDivElement | null;
    const dayThreeColumn = container.querySelector('[data-day-column-id="day-3"]') as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(dayThreeColumn).not.toBeNull();
    if (!scroller || !dayThreeColumn) return;

    Object.defineProperty(scroller, 'scrollLeft', {
      configurable: true,
      value: 24,
      writable: true,
    });
    Object.defineProperty(scroller, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(scroller, 'scrollWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(scroller, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 360,
        bottom: 500,
        width: 360,
        height: 500,
        toJSON: () => undefined,
      }),
    });
    Object.defineProperty(dayThreeColumn, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 260,
        y: 0,
        left: 260,
        top: 0,
        right: 460,
        bottom: 500,
        width: 200,
        height: 500,
        toJSON: () => undefined,
      }),
    });

    scrollToMock.mockClear();
    rerender(
      <VerticalTimeline
        items={[]}
        days={days}
        selectedDayIds={['day-3']}
        dayRevealRequest={{ dayId: 'day-3', key: 'reveal-1' }}
      />,
    );

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        left: 232,
        behavior: 'smooth',
      });
    });
  });

  it('deletes the selected timeline item via keyboard hotkeys', async () => {
    const handleDeleteItem = vi.fn();
    const { container } = render(
      <VerticalTimeline
        items={[createItem()]}
        days={days}
        selectedDayIds={[]}
        selectedItemId="item-1"
        onDeleteItem={handleDeleteItem}
      />,
    );

    const root = container.querySelector('[data-timeline-root]') as HTMLDivElement | null;
    expect(root).not.toBeNull();
    if (!root) return;

    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });

    await waitFor(() => {
      expect(handleDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  it('renders overnight carryover in the target day timezone', async () => {
    const crossTimezoneDays = [
      createDay('day-1', '2026-05-12', 'Day 1', '#2563EB'),
      {
        ...createDay('day-2', '2026-05-13', 'Day 2', '#16A34A'),
        timezone: 'America/New_York',
      },
    ];

    const overnightItem = createItem({
      itemId: 'item-overnight',
      dayId: 'day-1',
      placeName: 'Overnight Train',
      type: 'transport',
      scheduledStart: '2026-05-12T23:30:00',
      scheduledEnd: '02:30',
      durationMinutes: 180,
    });

    const { container } = render(
      <VerticalTimeline
        items={[overnightItem]}
        days={crossTimezoneDays}
        selectedDayIds={[]}
      />,
    );

    const dayTwoColumn = container.querySelector('[data-day-column-id="day-2"]') as HTMLDivElement | null;
    expect(dayTwoColumn).not.toBeNull();
    if (!dayTwoColumn) return;

    await waitFor(() => {
      expect(within(dayTwoColumn).getByText('12:30a - 3:30a')).toBeTruthy();
      expect(within(dayTwoColumn).getByText('EDT')).toBeTruthy();
    });
  });

  it('uses the selected day timezone label for visible day items', async () => {
    const timezoneDays = [
      createDay('day-1', '2026-05-12', 'Day 1', '#2563EB'),
      {
        ...createDay('day-2', '2026-05-13', 'Day 2', '#16A34A'),
        timezone: 'Europe/London',
      },
    ];

    const { container } = render(
      <VerticalTimeline
        items={[
          createItem({
            itemId: 'item-day-2',
            dayId: 'day-2',
            placeName: 'River North Lunch',
            scheduledStart: '12:00',
            scheduledEnd: '13:00',
          }),
        ]}
        days={timezoneDays}
        selectedDayIds={['day-2']}
      />,
    );

    const dayTwoColumn = container.querySelector('[data-day-column-id="day-2"]') as HTMLDivElement | null;
    expect(dayTwoColumn).not.toBeNull();
    if (!dayTwoColumn) return;

    await waitFor(() => {
      expect(within(dayTwoColumn).getByText('12p - 1p')).toBeTruthy();
      expect(within(dayTwoColumn).getByText('BST')).toBeTruthy();
    });
  });
});
