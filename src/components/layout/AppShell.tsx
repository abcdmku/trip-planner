import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useUI } from '../../hooks/useUI';
import { Navbar } from './Navbar';
import { MobileTabs } from './MobileTabs';

interface AppShellProps {
  dayTabs?: ReactNode;
  itinerary?: ReactNode;
  timeline?: ReactNode;
  map?: ReactNode;
  timelineDayCount?: number;
  tripName?: string;
  onTripNameChange?: (name: string) => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  user?: { name: string; picture: string };
  onLogout?: () => void;
  shareControl?: ReactNode;
  activeCollaborators?: Array<{ userId: string; name: string; picture: string; color: string }>;
  workspaceOverlay?: ReactNode;
  topBanner?: ReactNode;
  workspaceRef?: Ref<HTMLDivElement>;
}

const ITINERARY_WIDTH = 360;
const TIMELINE_MIN_WIDTH = 280;
const LEFT_PANEL_MIN_WIDTH = ITINERARY_WIDTH + TIMELINE_MIN_WIDTH;
const MAP_MIN_WIDTH = 360;
const EDGE_GAP = 12;
const MAP_TAB_TRIGGER_GAP = 180;
const MULTI_DAY_COL_MAX_WIDTH = 220;
const MULTI_DAY_COL_GAP = 8;
const MULTI_VIEW_CHROME_WIDTH = 68;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function AppShell({
  dayTabs,
  itinerary,
  timeline,
  map,
  timelineDayCount = 1,
  tripName,
  onTripNameChange,
  syncStatus,
  user,
  onLogout,
  shareControl,
  activeCollaborators,
  workspaceOverlay,
  topBanner,
  workspaceRef,
}: AppShellProps) {
  const { activeTab, setActiveTab } = useUI();
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_MIN_WIDTH + 80);
  const [isResizing, setIsResizing] = useState(false);
  const [desktopMapTabbed, setDesktopMapTabbed] = useState(false);
  const [willTabMapOnRelease, setWillTabMapOnRelease] = useState(false);
  const resizeStateRef = useRef({ startX: 0, startWidth: leftPanelWidth });
  const leftPanelWidthRef = useRef(leftPanelWidth);

  useEffect(() => {
    leftPanelWidthRef.current = leftPanelWidth;
  }, [leftPanelWidth]);

  const timelineMaxWidth = useMemo(() => {
    const dayCount = Math.max(1, timelineDayCount);
    const allDaysWidth =
      MULTI_VIEW_CHROME_WIDTH +
      dayCount * MULTI_DAY_COL_MAX_WIDTH +
      Math.max(0, dayCount - 1) * MULTI_DAY_COL_GAP;
    return Math.max(TIMELINE_MIN_WIDTH, allDaysWidth);
  }, [timelineDayCount]);

  const leftPanelMaxByContent = ITINERARY_WIDTH + timelineMaxWidth;

  const getViewportWidth = useCallback(() => {
    if (typeof window === 'undefined') {
      return LEFT_PANEL_MIN_WIDTH + MAP_MIN_WIDTH;
    }
    return window.innerWidth;
  }, []);

  const getDesktopResizeMaxWidth = useCallback(() => {
    const viewportLimit = getViewportWidth() - EDGE_GAP;
    return Math.max(
      LEFT_PANEL_MIN_WIDTH,
      Math.min(leftPanelMaxByContent, viewportLimit),
    );
  }, [getViewportWidth, leftPanelMaxByContent]);

  const getMapTabTriggerWidth = useCallback(() => {
    return Math.max(LEFT_PANEL_MIN_WIDTH, getViewportWidth() - MAP_TAB_TRIGGER_GAP);
  }, [getViewportWidth]);

  const getSplitRestoreWidth = useCallback(() => {
    return Math.max(LEFT_PANEL_MIN_WIDTH, getViewportWidth() - MAP_MIN_WIDTH);
  }, [getViewportWidth]);

  const shouldTabMapAtWidth = useCallback(
    (panelWidth: number) => panelWidth >= getMapTabTriggerWidth(),
    [getMapTabTriggerWidth],
  );

  useEffect(() => {
    const handleResize = () => {
      const maxWidth = getDesktopResizeMaxWidth();
      setLeftPanelWidth((current) => clamp(current, LEFT_PANEL_MIN_WIDTH, maxWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getDesktopResizeMaxWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizeStateRef.current.startX;
      const maxWidth = getDesktopResizeMaxWidth();
      const nextWidth = clamp(
        resizeStateRef.current.startWidth + deltaX,
        LEFT_PANEL_MIN_WIDTH,
        maxWidth,
      );
      leftPanelWidthRef.current = nextWidth;
      setLeftPanelWidth(nextWidth);
      if (!desktopMapTabbed) {
        setWillTabMapOnRelease(shouldTabMapAtWidth(nextWidth));
      }
    };

    const handleMouseUp = () => {
      const finalWidth = leftPanelWidthRef.current;
      if (!desktopMapTabbed && shouldTabMapAtWidth(finalWidth)) {
        setDesktopMapTabbed(true);
        setActiveTab('timeline');
      }
      if (desktopMapTabbed && finalWidth <= getSplitRestoreWidth()) {
        setDesktopMapTabbed(false);
      }
      setWillTabMapOnRelease(false);
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    desktopMapTabbed,
    getDesktopResizeMaxWidth,
    getSplitRestoreWidth,
    isResizing,
    setActiveTab,
    shouldTabMapAtWidth,
  ]);

  const clampedLeftPanelWidth = useMemo(
    () => clamp(leftPanelWidth, LEFT_PANEL_MIN_WIDTH, getDesktopResizeMaxWidth()),
    [getDesktopResizeMaxWidth, leftPanelWidth],
  );
  const timelineWidth = useMemo(
    () => clamp(clampedLeftPanelWidth - ITINERARY_WIDTH, TIMELINE_MIN_WIDTH, timelineMaxWidth),
    [clampedLeftPanelWidth, timelineMaxWidth],
  );

  const restoreSplitView = useCallback(() => {
    const splitTarget = clamp(
      getSplitRestoreWidth(),
      LEFT_PANEL_MIN_WIDTH,
      getDesktopResizeMaxWidth(),
    );
    setLeftPanelWidth(splitTarget);
    leftPanelWidthRef.current = splitTarget;
    setDesktopMapTabbed(false);
  }, [getDesktopResizeMaxWidth, getSplitRestoreWidth]);

  const desktopTabbedActiveTab =
    activeTab === 'map' || activeTab === 'itinerary' || activeTab === 'timeline'
      ? activeTab
      : 'timeline';

  return (
    <div ref={workspaceRef} className="flex h-screen flex-col overflow-hidden bg-theme">
      <Navbar
        tripName={tripName}
        onTripNameChange={onTripNameChange}
        syncStatus={syncStatus}
        user={user}
        onLogout={onLogout}
        shareControl={shareControl}
        activeCollaborators={activeCollaborators}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {topBanner && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-50">
            <div className="pointer-events-auto">{topBanner}</div>
          </div>
        )}
        {workspaceOverlay}

        {/* Desktop layout */}
        <div className="hidden h-full w-full md:flex">
          {desktopMapTabbed ? (
            <div className="flex h-full w-full flex-col">
              {dayTabs}
              <div className="flex items-center justify-between border-b border-theme bg-theme-elevated px-3 py-2">
                <div className="inline-flex rounded-md border border-theme bg-theme p-0.5">
                  {(['map', 'itinerary', 'timeline'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                        desktopTabbedActiveTab === tab
                          ? 'bg-theme-elevated text-theme shadow-theme-sm'
                          : 'text-theme-secondary hover:text-theme'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={restoreSplitView}
                  className="rounded-md border border-theme px-2.5 py-1 text-xs font-medium text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
                >
                  Return Split View
                </button>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  className={`absolute inset-0 transition-opacity duration-150 ${
                    desktopTabbedActiveTab === 'map'
                      ? 'z-10 opacity-100'
                      : 'pointer-events-none z-0 opacity-0'
                  }`}
                >
                  {map}
                </div>
                <div
                  className={`absolute inset-0 overflow-y-auto bg-theme-elevated transition-opacity duration-150 ${
                    desktopTabbedActiveTab === 'itinerary'
                      ? 'z-10 opacity-100'
                      : 'pointer-events-none z-0 opacity-0'
                  }`}
                >
                  {itinerary}
                </div>
                <div
                  className={`absolute inset-0 overflow-hidden bg-theme-subtle transition-opacity duration-150 ${
                    desktopTabbedActiveTab === 'timeline'
                      ? 'z-10 opacity-100'
                      : 'pointer-events-none z-0 opacity-0'
                  }`}
                >
                  {timeline}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left panel */}
              <div
                className="flex h-full flex-col border-r border-theme bg-theme-elevated"
                style={{ width: clampedLeftPanelWidth }}
              >
                {dayTabs}
                <div className="flex flex-1 overflow-hidden">
                  <div
                    className="flex-shrink-0 overflow-y-auto overflow-x-hidden border-r border-theme-subtle"
                    style={{ width: ITINERARY_WIDTH }}
                  >
                    {itinerary}
                  </div>
                  <div
                    className="overflow-hidden bg-theme-subtle"
                    style={{
                      width: timelineWidth,
                      minWidth: TIMELINE_MIN_WIDTH,
                      maxWidth: timelineMaxWidth,
                    }}
                  >
                    {timeline}
                  </div>
                </div>
              </div>

              <div
                className={`group relative hidden w-1 cursor-col-resize transition-colors md:block ${
                  isResizing && willTabMapOnRelease
                    ? 'bg-amber-500/80'
                    : isResizing
                      ? 'bg-accent/60'
                      : 'bg-theme-subtle/40 hover:bg-accent/50'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  resizeStateRef.current = {
                    startX: event.clientX,
                    startWidth: clampedLeftPanelWidth,
                  };
                  setWillTabMapOnRelease(false);
                  setIsResizing(true);
                }}
                role="separator"
                aria-label="Resize side panel"
                aria-orientation="vertical"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>

              {/* Map */}
              <div className="relative min-w-0 flex-1">
                {map}
                {isResizing && willTabMapOnRelease && (
                  <div className="pointer-events-none absolute inset-3 z-30 flex items-start">
                    <div className="rounded-lg border border-amber-400/60 bg-amber-50/90 px-3 py-2 text-xs font-medium text-amber-900 shadow-lg backdrop-blur dark:border-amber-500/40 dark:bg-amber-900/80 dark:text-amber-100">
                      Release to move Map into tabs
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile layout */}
        <div className="flex h-full w-full flex-col md:hidden">
          {dayTabs}
          <div className="relative flex-1 overflow-hidden">
            <div
              className={`absolute inset-0 transition-opacity duration-150 ${
                activeTab === 'map' ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {map}
            </div>
            <div
              className={`absolute inset-0 overflow-y-auto bg-theme-elevated transition-opacity duration-150 ${
                activeTab === 'itinerary' ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {itinerary}
            </div>
            <div
              className={`absolute inset-0 overflow-hidden bg-theme-elevated transition-opacity duration-150 ${
                activeTab === 'timeline' ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              {timeline}
            </div>
          </div>
        </div>
      </div>

      <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
