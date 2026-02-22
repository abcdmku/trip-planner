import { useRef, useState } from 'react';
import { Clock, MapPin, GripVertical, Trash2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import type { Item } from '../../types/trip';
import { TIMELINE_ITEM_DRAG_MIME } from '@/lib/timeline-drop';

interface ItemCardProps {
  item: Item;
  dayColor?: string;
  dayColors?: string[];
  isSelected?: boolean;
  isExpanded?: boolean;
  isDragging?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  dragHandleProps?: Record<string, unknown>;
  /** Enable native drag for cross-day dropping on day tabs */
  enableNativeDrag?: boolean;
  onNativeDragStart?: (itemId: string) => void;
  onNativeDragEnd?: () => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  attraction: { label: 'Attraction', emoji: '🏛️' },
  restaurant: { label: 'Restaurant', emoji: '🍽️' },
  hotel: { label: 'Hotel', emoji: '🏨' },
  transport: { label: 'Transport', emoji: '🚌' },
  activity: { label: 'Activity', emoji: '🎯' },
  other: { label: 'Other', emoji: '📍' },
};

export function ItemCard({
  item,
  dayColor = '#3B82F6',
  dayColors,
  isSelected = false,
  isExpanded = false,
  isDragging = false,
  onToggleExpand,
  onDelete,
  onClick,
  dragHandleProps,
  enableNativeDrag = true,
  onNativeDragStart,
  onNativeDragEnd,
}: ItemCardProps) {
  const typeInfo = TYPE_LABELS[item.type] || TYPE_LABELS.other;
  const visibleDayColors = (dayColors && dayColors.length > 0 ? dayColors : [dayColor]).filter(Boolean);
  const dragOriginIsHandleRef = useRef(false);
  const [isNativeDragging, setIsNativeDragging] = useState(false);

  const isReorderHandleTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('[data-reorder-handle="true"]'));
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!enableNativeDrag || dragOriginIsHandleRef.current || isReorderHandleTarget(e.target)) {
      e.preventDefault();
      dragOriginIsHandleRef.current = false;
      return;
    }

    // Hide the browser's default drag ghost
    const ghost = document.createElement('div');
    ghost.style.width = '1px';
    ghost.style.height = '1px';
    ghost.style.opacity = '0.01';
    ghost.style.position = 'fixed';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());

    e.dataTransfer.setData(TIMELINE_ITEM_DRAG_MIME, item.itemId);
    e.dataTransfer.setData('text/plain', item.itemId);
    e.dataTransfer.effectAllowed = 'move';
    setIsNativeDragging(true);
    onNativeDragStart?.(item.itemId);
  };

  const handleDragEnd = () => {
    dragOriginIsHandleRef.current = false;
    setIsNativeDragging(false);
    onNativeDragEnd?.();
  };

  return (
    <div
      className={`group rounded-xl border transition-all ${
        isNativeDragging
          ? 'border-dashed border-theme opacity-40 scale-[0.97]'
          : isDragging
            ? 'border-accent shadow-lg shadow-accent/10 scale-[1.02]'
            : isSelected
              ? 'border-accent/80 bg-theme-highlight shadow-md shadow-accent/20 ring-1 ring-accent/35'
              : 'border-theme-subtle bg-theme-elevated hover:border-theme hover:bg-theme-subtle hover:shadow-theme-sm'
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={enableNativeDrag}
      onPointerDownCapture={() => {
        dragOriginIsHandleRef.current = false;
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            className="mt-1 cursor-grab rounded p-0.5 text-theme-tertiary transition-colors hover:text-theme-secondary active:cursor-grabbing"
            aria-label="Drag to reorder"
            data-reorder-handle="true"
            {...dragHandleProps}
            onPointerDownCapture={() => {
              dragOriginIsHandleRef.current = true;
            }}
            onDragStart={(event) => {
              event.preventDefault();
            }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Color bar */}
        <div
          className="mt-1 flex h-10 w-1.5 flex-shrink-0 flex-col gap-px overflow-hidden rounded-full"
          title={visibleDayColors.length > 1 ? `Appears on ${visibleDayColors.length} days` : undefined}
        >
          {visibleDayColors.map((color, index) => (
            <div key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{typeInfo.emoji}</span>
            <h4 className="truncate text-sm font-semibold text-theme">
              {item.placeName}
            </h4>
            {visibleDayColors.length > 1 && (
              <span className="flex flex-shrink-0 items-center gap-0.5" aria-label={`Appears on ${visibleDayColors.length} days`}>
                {visibleDayColors.map((color, index) => (
                  <span
                    key={`dot-${color}-${index}`}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            )}
            {item.timelineLocked && (
              <Lock className="h-3 w-3 flex-shrink-0 text-theme-tertiary" />
            )}
            {item.isOptional && (
              <span className="flex-shrink-0 rounded bg-theme-subtle px-1.5 py-0.5 text-[10px] font-medium text-theme-tertiary">
                Optional
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-theme-tertiary">
            {item.scheduledStart && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.scheduledStart}
                {item.scheduledEnd && ` – ${item.scheduledEnd}`}
              </span>
            )}
            {item.durationMinutes > 0 && (
              <span>{item.durationMinutes}m</span>
            )}
          </div>

          {item.address && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-theme-tertiary">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {item.address}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="rounded p-1 text-theme-tertiary opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
              aria-label="Delete item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onToggleExpand && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="rounded p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-theme-secondary"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
