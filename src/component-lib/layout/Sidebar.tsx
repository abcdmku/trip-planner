import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export interface SidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
}

export function Sidebar({
  children,
  isOpen,
  onToggle,
  title = 'Itinerary',
}: SidebarProps) {
  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r border-theme bg-theme-elevated/95 backdrop-blur-sm transition-all duration-300 ease-out md:relative md:top-0 ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'
        }`}
        aria-label={title}
      >
        <div
          className={`flex h-full w-80 flex-col overflow-hidden transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-theme-subtle px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">
              {title}
            </span>
            <button
              onClick={onToggle}
              className="rounded-lg p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-theme"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </aside>

      {!isOpen ? (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-theme bg-theme-elevated/90 p-2 shadow-theme-sm backdrop-blur-sm transition-all hover:bg-theme-subtle hover:shadow-theme-md md:block"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="h-4 w-4 text-theme-secondary" />
        </button>
      ) : null}
    </>
  );
}
