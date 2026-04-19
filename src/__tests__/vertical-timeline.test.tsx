import { render, waitFor } from '@testing-library/react';
import { VerticalTimeline } from '@/components/timeline/VerticalTimeline';
import type { Day } from '@/types/trip';

function createDay(dayId: string, date: string, label: string, colorHex: string): Day {
  return {
    dayId,
    date,
    label,
    colorHex,
    dayStart: '08:00',
    dayEnd: '22:00',
  };
}

const days = [
  createDay('day-1', '2026-04-18', 'Day 1', '#2563EB'),
  createDay('day-2', '2026-04-19', 'Day 2', '#16A34A'),
];

describe('VerticalTimeline', () => {
  const originalScrollTo = HTMLElement.prototype.scrollTo;

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
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

  it('publishes day view when a single day is selected from the top tabs', async () => {
    const handleViewportChange = vi.fn();
    const { rerender } = render(
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
          viewMode: 'day',
          focusedDayId: 'day-2',
        }),
      );
    });
  });
});
