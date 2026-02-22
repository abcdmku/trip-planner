import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemCard } from './ItemCard';
import { ItemDetailCard } from './ItemDetailCard';
import { TripEndpointRow } from './TripEndpointRow';
import type { Item, Day, Trip } from '../../types/trip';
import { ListPlus } from 'lucide-react';

interface ItineraryListProps {
  items: Item[];
  days: Day[];
  itemDayColorsById?: Map<string, string[]>;
  trip?: Trip | null;
  selectedItemId?: string | null;
  expandedItemId?: string | null;
  onExpandedItemChange?: (id: string | null) => void;
  onReorder?: (itemIds: string[]) => void;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: () => void;
  onItemClick?: (itemId: string) => void;
  onUpdateTrip?: (updates: Partial<Trip>) => void;
  onExternalDragStart?: (itemId: string) => void;
  onExternalDragEnd?: () => void;
}

function SortableItem({
  item,
  dayColor,
  dayColors,
  dayDate,
  isSelected,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
  onClick,
  onExternalDragStart,
  onExternalDragEnd,
}: {
  item: Item;
  dayColor: string;
  dayColors?: string[];
  dayDate?: string;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<Item>) => void;
  onClick?: () => void;
  onExternalDragStart?: (itemId: string) => void;
  onExternalDragEnd?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.itemId });

  const constrainedTransform = transform ? { ...transform, x: 0 } : null;
  const style = {
    transform: CSS.Transform.toString(constrainedTransform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {isExpanded ? (
        <ItemDetailCard
          item={item}
          dayColor={dayColor}
          dayDate={dayDate}
          density="compact"
          onUpdate={onUpdate ? (updates) => onUpdate(updates) : undefined}
          onClose={onToggleExpand}
        />
      ) : (
        <ItemCard
          item={item}
          dayColor={dayColor}
          dayColors={dayColors}
          isSelected={isSelected}
          isExpanded={isExpanded}
          isDragging={isDragging}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onClick={onClick}
          dragHandleProps={listeners}
          onNativeDragStart={onExternalDragStart}
          onNativeDragEnd={onExternalDragEnd}
        />
      )}
    </div>
  );
}

export function ItineraryList({
  items,
  days,
  itemDayColorsById,
  trip,
  selectedItemId = null,
  expandedItemId,
  onExpandedItemChange,
  onReorder,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onItemClick,
  onUpdateTrip,
  onExternalDragStart,
  onExternalDragEnd,
}: ItineraryListProps) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const expandedId = expandedItemId !== undefined ? expandedItemId : internalExpandedId;
  const setExpandedId = onExpandedItemChange ?? setInternalExpandedId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dayColorMap = new Map(days.map((d) => [d.dayId, d.colorHex]));
  const dayDateMap = new Map(days.map((d) => [d.dayId, d.date]));
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sorted.findIndex((i) => i.itemId === active.id);
      const newIndex = sorted.findIndex((i) => i.itemId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorder?.(reordered.map((i) => i.itemId));
    },
    [sorted, onReorder],
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-subtle">
          <ListPlus className="h-7 w-7 text-theme-tertiary" />
        </div>
        <div>
          <p className="text-sm font-medium text-theme-secondary">No stops yet</p>
          <p className="text-xs text-theme-tertiary">Search for places to add to your itinerary</p>
        </div>
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="btn-primary rounded-lg px-4 py-2 text-xs font-semibold"
          >
            Add First Stop
          </button>
        )}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((i) => i.itemId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 p-2">
          {trip && onUpdateTrip && (
            <TripEndpointRow trip={trip} onUpdate={onUpdateTrip} />
          )}

          {sorted.map((item) => (
            <SortableItem
              key={item.itemId}
              item={item}
              dayColor={dayColorMap.get(item.dayId) ?? '#3B82F6'}
              dayColors={itemDayColorsById?.get(item.itemId)}
              dayDate={dayDateMap.get(item.dayId)}
              isSelected={selectedItemId === item.itemId}
              isExpanded={expandedId === item.itemId}
              onToggleExpand={() => setExpandedId(expandedId === item.itemId ? null : item.itemId)}
              onDelete={onDeleteItem ? () => onDeleteItem(item.itemId) : undefined}
              onUpdate={onUpdateItem ? (updates) => onUpdateItem(item.itemId, updates) : undefined}
              onClick={onItemClick ? () => onItemClick(item.itemId) : undefined}
              onExternalDragStart={onExternalDragStart}
              onExternalDragEnd={onExternalDragEnd}
            />
          ))}

          {onAddItem && (
            <button
              onClick={onAddItem}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-theme py-3 text-xs font-medium text-theme-tertiary transition-all hover:border-accent hover:text-accent"
            >
              <ListPlus className="h-4 w-4" />
              Add Stop
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
