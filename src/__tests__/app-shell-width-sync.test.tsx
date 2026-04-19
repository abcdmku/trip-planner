import { act, render, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { UIProvider } from '@/contexts/UIContext';
import { ThemeProvider } from '@/hooks/useTheme';

function renderAppShell(props?: Partial<ComponentProps<typeof AppShell>>) {
  return render(
    <UIProvider>
      <ThemeProvider>
        <AppShell
          dayTabs={<div>Days</div>}
          itinerary={<div>Itinerary</div>}
          timeline={<div>Timeline</div>}
          map={<div>Map</div>}
          {...props}
        />
      </ThemeProvider>
    </UIProvider>,
  );
}

describe('AppShell width sync', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('does not echo a prop-driven desktop width back to the parent', async () => {
    const handleWidthChange = vi.fn();

    renderAppShell({
      desktopLeftPanelWidth: 700,
      onDesktopLeftPanelWidthChange: handleWidthChange,
    });

    await act(async () => {});
    expect(handleWidthChange).not.toHaveBeenCalled();
  });

  it('reports a locally clamped width once on mount', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 700,
      writable: true,
    });
    const handleWidthChange = vi.fn();

    renderAppShell({
      onDesktopLeftPanelWidthChange: handleWidthChange,
    });

    await waitFor(() => {
      expect(handleWidthChange).toHaveBeenCalledTimes(1);
      expect(handleWidthChange).toHaveBeenCalledWith(648);
    });
  });
});
