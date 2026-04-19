import type { ComponentProps } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { AppShell } from '@component-lib/layout/AppShell';
import { UIContext, type UIContextValue } from '@/contexts/UIContext';
import { ThemeProvider } from '@/hooks/useTheme';

function createUIContextValue(): UIContextValue {
  return {
    sidebarOpen: true,
    activeTab: 'timeline',
    selectedDayIds: [],
    selectedItemId: null,
    activePanelView: 'itinerary',
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    setActiveTab: vi.fn(),
    setSelectedDays: vi.fn(),
    setSelectedItemId: vi.fn(),
    setActivePanelView: vi.fn(),
  };
}

function renderAppShell(props: Partial<ComponentProps<typeof AppShell>> = {}) {
  const contextValue = createUIContextValue();

  const view = render(
    <UIContext.Provider value={contextValue}>
      <ThemeProvider>
        <AppShell
          dayTabs={<div>days</div>}
          itinerary={<div>itinerary</div>}
          timeline={<div>timeline</div>}
          map={<div>map</div>}
          {...props}
        />
      </ThemeProvider>
    </UIContext.Provider>,
  );

  return {
    ...view,
    rerenderShell: (nextProps: Partial<ComponentProps<typeof AppShell>> = {}) =>
      view.rerender(
        <UIContext.Provider value={contextValue}>
          <ThemeProvider>
            <AppShell
              dayTabs={<div>days</div>}
              itinerary={<div>itinerary</div>}
              timeline={<div>timeline</div>}
              map={<div>map</div>}
              {...nextProps}
            />
          </ThemeProvider>
        </UIContext.Provider>,
      ),
  };
}

describe('AppShell width synchronization', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
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
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it('does not echo prop-driven left panel width changes back to the parent callback', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 700,
    });
    const handleWidthChange = vi.fn();

    const { rerenderShell } = renderAppShell({
      desktopLeftPanelWidth: 1000,
      onDesktopLeftPanelWidthChange: handleWidthChange,
    });

    await act(async () => {});
    expect(handleWidthChange).not.toHaveBeenCalled();

    rerenderShell({
      desktopLeftPanelWidth: 660,
      onDesktopLeftPanelWidthChange: handleWidthChange,
    });

    await act(async () => {});
    expect(handleWidthChange).not.toHaveBeenCalled();
  });

  it('reports a local window clamp once', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 700,
    });
    const handleWidthChange = vi.fn();

    renderAppShell({ onDesktopLeftPanelWidthChange: handleWidthChange });

    await waitFor(() => {
      expect(handleWidthChange).toHaveBeenCalledTimes(1);
      expect(handleWidthChange).toHaveBeenCalledWith(648);
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await act(async () => {});
    expect(handleWidthChange).toHaveBeenCalledTimes(1);
  });
});
