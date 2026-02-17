import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ children, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/30 backdrop-blur-sm md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r border-stone-200/60 bg-white/95 backdrop-blur-sm transition-all duration-300 ease-out md:relative md:top-0 ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'
        }`}
        aria-label="Sidebar"
      >
        <div className={`flex h-full w-80 flex-col overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Itinerary
            </span>
            <button
              onClick={onToggle}
              className="rounded-lg p-1 text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-500"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </aside>

      {/* Toggle tab when closed (desktop only) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-r-lg border border-l-0 border-stone-200 bg-white/90 p-2 shadow-sm backdrop-blur-sm transition-all hover:bg-stone-50 hover:shadow-md md:block"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="h-4 w-4 text-stone-400" />
        </button>
      )}
    </>
  );
}
