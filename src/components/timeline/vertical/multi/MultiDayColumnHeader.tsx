import { useState } from 'react';
import type React from 'react';
import type { Day } from '@/types/trip';
import { getDayDisplayLabel } from '@/lib/day-labels';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const displayLabel = getDayDisplayLabel(day);

  const handleDragOver = (e: React.DragEvent) => {
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    setIsDragOver(false);
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className={`sticky top-0 z-10 flex w-full items-center justify-between border-b px-2 py-1.5 text-left transition-colors ${
        isDragOver
          ? 'border-accent/60 bg-accent/15'
          : isActive ? 'border-accent/40 bg-accent/5' : 'border-theme bg-theme hover:bg-theme-subtle/60'
      }`}
      style={{ height: MULTI_HEADER_H }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: day.colorHex }} />
        <span className="truncate text-[10px] font-semibold text-theme">{displayLabel}</span>
      </div>
      <span className="ml-1 flex-shrink-0 text-[9px] text-theme-tertiary">{day.date}</span>
    </button>
  );
}
