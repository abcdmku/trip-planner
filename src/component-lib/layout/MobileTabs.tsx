import { Map, List, Clock, Zap } from 'lucide-react';
import type { AppShellTab } from './AppShell';

interface MobileTabsProps {
  activeTab: AppShellTab;
  onTabChange: (tab: AppShellTab) => void;
}

const TABS = [
  { id: 'map', label: 'Map', icon: Map },
  { id: 'itinerary', label: 'Itinerary', icon: List },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'optimize', label: 'Optimize', icon: Zap },
] as const;

export function MobileTabs({ activeTab, onTabChange }: MobileTabsProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-theme bg-theme-elevated/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-all ${
                isActive
                  ? 'text-accent'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </span>
              <span
                className={`text-[10px] font-medium transition-all ${
                  isActive ? 'opacity-100' : 'opacity-0 scale-95'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
