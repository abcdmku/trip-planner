import { Clock, MapPin, GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Item } from '../../types/trip';

interface ItemCardProps {
  item: Item;
  dayColor?: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  isDragging?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  dragHandleProps?: Record<string, unknown>;
  /** Enable native drag for cross-day dropping on day tabs */
  enableNativeDrag?: boolean;
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
  isSelected = false,
  isExpanded = false,
  isDragging = false,
  onToggleExpand,
  onDelete,
  onClick,
  dragHandleProps,
  enableNativeDrag = true,
}: ItemCardProps) {
  const typeInfo = TYPE_LABELS[item.type] || TYPE_LABELS.other;

  const handleDragStart = (e: React.DragEvent) => {
    if (!enableNativeDrag) return;
    e.dataTransfer.setData('text/plain', item.itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`group rounded-xl border transition-all ${
        isDragging
          ? 'border-accent shadow-lg shadow-accent/10 scale-[1.02]'
          : isSelected
            ? 'border-accent/80 bg-theme-highlight shadow-md shadow-accent/20 ring-1 ring-accent/35'
            : 'border-theme-subtle bg-theme-elevated hover:border-theme hover:bg-theme-subtle hover:shadow-theme-sm'
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={enableNativeDrag}
      onDragStart={handleDragStart}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            className="mt-1 cursor-grab rounded p-0.5 text-theme-tertiary transition-colors hover:text-theme-secondary active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Color bar */}
        <div
          className="mt-1 h-10 w-1 flex-shrink-0 rounded-full"
          style={{ backgroundColor: dayColor }}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{typeInfo.emoji}</span>
            <h4 className="truncate text-sm font-semibold text-theme">
              {item.placeName}
            </h4>
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
