import type React from 'react';
import type { Day } from '@/types/trip';
import { MULTI_HEADER_H } from '../constants';

interface MultiDayColumnHeaderProps {
  day: Day;
  isActive: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function MultiDayColumnHeader({
  day,
  isActive,
  onClick,
  onDragOver,
  onDrop,
  onDragLeave,
}: MultiDayColumnHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      className={`sticky top-0 z-10 flex w-full items-center justify-between border-b px-2 py-1.5 text-left transition-colors ${
        isActive ? 'border-accent/40 bg-accent/5' : 'border-theme bg-theme hover:bg-theme-subtle/60'
      }`}
      style={{ height: MULTI_HEADER_H }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: day.colorHex }} />
        <span className="truncate text-[10px] font-semibold text-theme">{day.label}</span>
      </div>
      <span className="ml-1 flex-shrink-0 text-[9px] text-theme-tertiary">{day.date}</span>
    </button>
  );
}
