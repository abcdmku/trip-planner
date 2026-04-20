import { useState } from 'react';
import type React from 'react';
import { TimezoneBadge } from '@/component-lib/timezone/TimezoneBadge';
import type { Day } from '@/types/trip';
import { getDayDisplayLabel } from '@/lib/day-labels';
import { MULTI_HEADER_H } from '../constants';

interface MultiDayColumnHeaderProps {
  day: Day;
  baseTimezone?: string;
  isActive: boolean;
  onClick: () => void;
  onTimezoneClick?: (day: Day) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function MultiDayColumnHeader({
  day,
  baseTimezone,
  isActive,
  onClick,
  onTimezoneClick,
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

  const handleTimezoneClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTimezoneClick?.(day);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className={`sticky top-0 z-10 flex w-full items-center gap-2 border-b px-2 py-1.5 transition-colors ${
        isDragOver
          ? 'border-accent/60 bg-accent/15'
          : isActive ? 'border-accent/40 bg-accent/5' : 'border-theme bg-theme hover:bg-theme-subtle/60'
      }`}
      style={{ height: MULTI_HEADER_H }}
    >
      <div className="relative flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center justify-between pr-12 text-left"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: day.colorHex }} />
            <span className="truncate text-[10px] font-semibold text-theme">{displayLabel}</span>
          </div>
          <span className="ml-1 flex-shrink-0 text-[9px] text-theme-tertiary">{day.date}</span>
        </button>

        <button
          type="button"
          data-day-timezone-button-id={day.dayId}
          onClick={handleTimezoneClick}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label={`Edit timezone for ${displayLabel}`}
        >
          <TimezoneBadge timezone={day.timezone} baseTimezone={baseTimezone} date={day.date} variant="embedded" />
        </button>
      </div>
    </div>
  );
}
