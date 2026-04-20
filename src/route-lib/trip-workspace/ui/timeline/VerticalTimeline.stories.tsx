import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
import { DayEditor } from '@/component-lib/days/DayEditor';
import { DayTabs } from '@/component-lib/days/DayTabs';
import { createDayFixture, createItemFixture } from '@/component-lib/story-support/trip-fixtures';
import { getTimezoneAbbr } from '@/lib/timezone';
import { TIMELINE_ITEM_DRAG_MIME } from '@/lib/timeline-drop';
import type { Day, Item } from '@/types/trip';
import {
  buildTimelineItemDuplicate,
  mergeTimelineItemUpdates,
  shouldDuplicateTimelineItem,
} from '@route-lib/trip-workspace/helpers/timeline-item-mutations';
import { VerticalTimeline } from './VerticalTimeline';

const baseTimezone = 'America/Chicago';

const days = [
  createDayFixture({
    dayId: 'day-1',
    date: '2026-05-12',
    label: 'Day 1',
    colorHex: '#2563EB',
  }),
  createDayFixture({
    dayId: 'day-2',
    date: '2026-05-13',
    label: 'Day 2',
    colorHex: '#16A34A',
  }),
  createDayFixture({
    dayId: 'day-3',
    date: '2026-05-14',
    label: 'Day 3',
    colorHex: '#F59E0B',
  }),
];

const museum = createItemFixture({
  itemId: 'item-museum',
  dayId: 'day-1',
  placeName: 'Art Institute of Chicago',
  scheduledStart: '09:00',
  scheduledEnd: '10:30',
  sortOrder: 0,
});

const lunch = createItemFixture({
  itemId: 'item-lunch',
  dayId: 'day-2',
  placeId: 'place-lunch',
  placeName: 'River North Lunch',
  scheduledStart: '12:00',
  scheduledEnd: '13:00',
  sortOrder: 1,
});
const deleteSpy = fn();

const crossTimezoneDays = [
  createDayFixture({
    dayId: 'day-1',
    date: '2026-05-12',
    label: 'Day 1',
    colorHex: '#2563EB',
    timezone: 'America/Chicago',
  }),
  createDayFixture({
    dayId: 'day-2',
    date: '2026-05-13',
    label: 'Day 2',
    colorHex: '#16A34A',
    timezone: 'America/New_York',
  }),
];

const overnightTransit = createItemFixture({
  itemId: 'item-overnight',
  dayId: 'day-1',
  placeId: 'place-overnight',
  placeName: 'Overnight Train',
  scheduledStart: '2026-05-12T23:30:00',
  scheduledEnd: '02:30',
  durationMinutes: 180,
  type: 'transport',
});

function SelectedDayRevealStory() {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [dayRevealRequest, setDayRevealRequest] = useState<{ dayId: string; key: string } | null>(null);

  const handleSelectDay = useCallback(
    (dayId: string | null) => {
      if (dayId && dayId === selectedDayId) {
        setDayRevealRequest({ dayId, key: crypto.randomUUID() });
      }
      setSelectedDayId(dayId);
    },
    [selectedDayId],
  );

  return (
    <div className="space-y-3 bg-theme p-4">
      <DayTabs
        days={days}
        baseTimezone={baseTimezone}
        selectedDayId={selectedDayId}
        onSelectDay={handleSelectDay}
      />
      <div className="flex h-[620px] w-[420px]">
        <VerticalTimeline
          items={[museum, lunch]}
          days={days}
          baseTimezone={baseTimezone}
          selectedDayIds={selectedDayId ? [selectedDayId] : []}
          dayRevealRequest={dayRevealRequest}
        />
      </div>
    </div>
  );
}

function TimezoneConfigurationStory() {
  const [storyDays, setStoryDays] = useState<Day[]>(days);
  const [selectedDayId, setSelectedDayId] = useState<string | null>('day-2');
  const [editingDay, setEditingDay] = useState<Day | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEditDay = useCallback((day: Day) => {
    setEditingDay(day);
    setEditorOpen(true);
  }, []);

  const handleSaveDay = useCallback((dayData: Partial<Day> & { dayId: string }) => {
    setStoryDays((current) =>
      current.map((day) =>
        day.dayId === dayData.dayId ? { ...day, ...dayData, timezone: dayData.timezone ?? day.timezone } : day,
      ),
    );
  }, []);

  return (
    <div className="space-y-3 bg-theme p-4">
      <DayTabs
        days={storyDays}
        baseTimezone={baseTimezone}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
        onEditDay={handleEditDay}
      />
      <div className="flex h-[620px] w-[420px]">
        <VerticalTimeline
          items={[museum, lunch]}
          days={storyDays}
          baseTimezone={baseTimezone}
          selectedDayIds={selectedDayId ? [selectedDayId] : []}
          onEditDay={handleEditDay}
        />
      </div>
      <DayEditor
        day={editingDay}
        isOpen={editorOpen}
        defaultLabel="Trip Day"
        defaultDate={editingDay?.date ?? days[0].date}
        baseTimezone={baseTimezone}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveDay}
      />
    </div>
  );
}

function DeleteStory({ onDelete }: { onDelete: (itemId: string) => void }) {
  const [items, setItems] = useState<Item[]>([museum]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(museum.itemId);

  const handleDelete = useCallback(
    (itemId: string) => {
      onDelete(itemId);
      setItems((current) => current.filter((item) => item.itemId !== itemId));
      setSelectedItemId((current) => (current === itemId ? null : current));
    },
    [onDelete],
  );

  return (
    <div className="flex h-[620px] w-[420px] bg-theme p-4">
      <VerticalTimeline
        items={items}
        days={days}
        baseTimezone={baseTimezone}
        selectedDayIds={[]}
        selectedItemId={selectedItemId}
        onItemClick={setSelectedItemId}
        onDeleteItem={handleDelete}
      />
    </div>
  );
}

function RepeatedExternalAddStory() {
  const [items, setItems] = useState<Item[]>([museum]);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const handleTimelineUpdate = useCallback(
    (itemId: string, updates: Partial<Item>) => {
      setItems((current) => {
        const existing = current.find((item) => item.itemId === itemId);
        if (!existing) return current;

        const merged = mergeTimelineItemUpdates(existing, updates);
        if (shouldDuplicateTimelineItem(existing, draggingItemId)) {
          return [...current, buildTimelineItemDuplicate(merged, current)];
        }

        return current.map((item) => (item.itemId === itemId ? merged : item));
      });
    },
    [draggingItemId],
  );

  return (
    <div className="space-y-3 bg-theme p-4">
      <div className="flex items-center gap-2">
        <div
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(TIMELINE_ITEM_DRAG_MIME, museum.itemId);
            event.dataTransfer.setData('text/plain', museum.itemId);
            setDraggingItemId(museum.itemId);
          }}
          onDragEnd={() => setDraggingItemId(null)}
          className="cursor-grab rounded-xl border border-theme bg-theme-elevated px-3 py-2 text-sm text-theme shadow-theme-sm"
        >
          Drag Art Institute of Chicago
        </div>
        <p className="text-xs text-theme-secondary">Drop the same itinerary item into the timeline more than once.</p>
      </div>

      <div className="flex h-[620px] w-[420px]">
        <VerticalTimeline
          items={items}
          days={days}
          baseTimezone={baseTimezone}
          selectedDayIds={[]}
          activeDragItemId={draggingItemId}
          onUpdateItem={handleTimelineUpdate}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Route Lib/Trip Workspace/VerticalTimeline',
  component: VerticalTimeline,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof VerticalTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SelectedDayRevealStaysMultiDay: Story = {
  render: () => <SelectedDayRevealStory />,
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector('[data-timeline-scroller]') as HTMLDivElement | null;
    const dayThreeColumn = canvasElement.querySelector('[data-day-column-id="day-3"]') as HTMLDivElement | null;
    const dayThreeTab = canvasElement.querySelector('[data-day-tab-id="day-3"]') as HTMLButtonElement | null;
    expect(scroller).not.toBeNull();
    expect(dayThreeColumn).not.toBeNull();
    expect(dayThreeTab).not.toBeNull();
    if (!scroller || !dayThreeColumn || !dayThreeTab) return;

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
    scroller.scrollTo = (optionsOrX?: ScrollToOptions | number) => {
      scroller.scrollLeft =
        typeof optionsOrX === 'number' ? optionsOrX : optionsOrX?.left ?? 0;
    };
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

    fireEvent.click(dayThreeTab);

    await waitFor(() => {
      expect(scroller.scrollLeft).toBe(232);
      expect(canvasElement.querySelector('[data-timeline-scroller]')).toBeInTheDocument();
    });

    scroller.scrollLeft = 64;
    fireEvent.click(dayThreeTab);

    await waitFor(() => {
      expect(scroller.scrollLeft).toBe(232);
    });
  },
};

export const TimezoneConfiguration: Story = {
  render: () => <TimezoneConfigurationStory />,
  play: async ({ canvasElement }) => {
    const dayTwoTimezoneButton = canvasElement.querySelector(
      '[data-day-tab-timezone-id="day-2"]',
    ) as HTMLButtonElement | null;
    expect(dayTwoTimezoneButton).not.toBeNull();
    if (!dayTwoTimezoneButton) return;

    fireEvent.click(dayTwoTimezoneButton);

    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByLabelText('Timezone'), {
      target: { value: 'Europe/London' },
    });
    fireEvent.click(canvas.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(within(dayTwoTimezoneButton).getByText(getTimezoneAbbr('Europe/London', new Date('2026-05-13T12:00:00Z')))).toBeInTheDocument();
    });

    const dayTwoColumn = canvasElement.querySelector('[data-day-column-id="day-2"]') as HTMLDivElement | null;
    expect(dayTwoColumn).not.toBeNull();
    if (!dayTwoColumn) return;

    await waitFor(() => {
      expect(within(dayTwoColumn).getByText('12p - 1p')).toBeInTheDocument();
      expect(within(dayTwoColumn).getByText('BST')).toBeInTheDocument();
    });
  },
};

export const DeleteSelectedEvent: Story = {
  render: () => {
    deleteSpy.mockClear();
    return <DeleteStory onDelete={deleteSpy} />;
  },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-timeline-root]') as HTMLDivElement | null;
    expect(root).not.toBeNull();
    if (!root) return;

    root.focus();
    fireEvent.keyDown(root, { key: 'Delete' });

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('item-museum');
    });

    await waitFor(() => {
      expect(within(canvasElement).queryByText('Art Institute of Chicago')).not.toBeInTheDocument();
    });
  },
};

export const CrossTimezoneOvernightSpan: Story = {
  render: () => (
    <div className="flex h-[620px] w-[520px] bg-theme p-4">
      <VerticalTimeline
        items={[overnightTransit]}
        days={crossTimezoneDays}
        baseTimezone={baseTimezone}
        selectedDayIds={[]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const dayTwoColumn = canvasElement.querySelector('[data-day-column-id="day-2"]') as HTMLDivElement | null;
    expect(dayTwoColumn).not.toBeNull();
    if (!dayTwoColumn) return;

    await waitFor(() => {
      expect(within(dayTwoColumn).getByText('12:30a - 3:30a')).toBeInTheDocument();
      expect(within(dayTwoColumn).getByText('EDT')).toBeInTheDocument();
    });
  },
};

export const RepeatedExternalAdds: Story = {
  render: () => <RepeatedExternalAddStory />,
  play: async ({ canvasElement }) => {
    const source = within(canvasElement).getByText('Drag Art Institute of Chicago');
    const firstDayBody = canvasElement.querySelector('[data-timeline-body]') as HTMLDivElement | null;
    expect(firstDayBody).not.toBeNull();
    if (!firstDayBody) return;

    const dragToTimeline = () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData(TIMELINE_ITEM_DRAG_MIME, museum.itemId);
      dataTransfer.setData('text/plain', museum.itemId);

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragOver(firstDayBody, { dataTransfer, clientX: 120, clientY: 180 });
      fireEvent.drop(firstDayBody, { dataTransfer, clientX: 120, clientY: 180 });
      fireEvent.dragEnd(source, { dataTransfer });
    };

    dragToTimeline();
    dragToTimeline();

    await waitFor(() => {
      expect(within(firstDayBody).getAllByText('Art Institute of Chicago')).toHaveLength(3);
    });
  },
};
