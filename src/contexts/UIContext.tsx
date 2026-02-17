import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  selectedDayIds: string[];
  selectedItemId: string | null;
  activePanelView: 'itinerary' | 'timeline' | 'optimize' | 'history';
}

export interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedDays: (dayIds: string[]) => void;
  setSelectedItemId: (itemId: string | null) => void;
  setActivePanelView: (view: UIState['activePanelView']) => void;
}

export type UIContextValue = UIState & UIActions;

export const UIContext = createContext<UIContextValue | null>(null);

function loadSidebarState(): boolean {
  try {
    const stored = localStorage.getItem('trip-planner:sidebar');
    return stored !== null ? JSON.parse(stored) : true;
  } catch {
    return true;
  }
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpenRaw] = useState(loadSidebarState);
  const [activeTab, setActiveTab] = useState('map');
  const [selectedDayIds, setSelectedDays] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activePanelView, setActivePanelView] = useState<UIState['activePanelView']>('itinerary');

  useEffect(() => {
    localStorage.setItem('trip-planner:sidebar', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpenRaw((p) => !p), []);
  const setSidebarOpen = useCallback((open: boolean) => setSidebarOpenRaw(open), []);

  const value = useMemo<UIContextValue>(
    () => ({
      sidebarOpen,
      activeTab,
      selectedDayIds,
      selectedItemId,
      activePanelView,
      toggleSidebar,
      setSidebarOpen,
      setActiveTab,
      setSelectedDays,
      setSelectedItemId,
      setActivePanelView,
    }),
    [sidebarOpen, activeTab, selectedDayIds, selectedItemId, activePanelView, toggleSidebar, setSidebarOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
