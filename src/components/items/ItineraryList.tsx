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
import type { Item, Day } from '../../types/trip';
import { ListPlus } from 'lucide-react';

interface ItineraryListProps {
  items: Item[];
  days: Day[];
  selectedItemId?: string | null;
  expandedItemId?: string | null;
  onExpandedItemChange?: (id: string | null) => void;
  onReorder?: (itemIds: string[]) => void;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem?: () => void;
  onItemClick?: (itemId: string) => void;
}

function SortableItem({
  item,
  dayColor,
  isSelected,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdate,
  onClick,
}: {
  item: Item;
  dayColor: string;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<Item>) => void;
  onClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {isExpanded ? (
        <ItemDetailCard
          item={item}
          dayColor={dayColor}
          onUpdate={onUpdate ? (updates) => onUpdate(updates) : undefined}
          onClose={onToggleExpand}
        />
      ) : (
        <ItemCard
          item={item}
          dayColor={dayColor}
          isSelected={isSelected}
          isExpanded={isExpanded}
          isDragging={isDragging}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onClick={onClick}
          dragHandleProps={listeners}
        />
      )}
    </div>
  );
}

export function ItineraryList({
  items,
  days,
  selectedItemId = null,
  expandedItemId,
  onExpandedItemChange,
  onReorder,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onItemClick,
}: ItineraryListProps) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const expandedId = expandedItemId !== undefined ? expandedItemId : internalExpandedId;
  const setExpandedId = onExpandedItemChange ?? setInternalExpandedId;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dayColorMap = new Map(days.map((d) => [d.dayId, d.colorHex]));
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
          {sorted.map((item) => (
            <SortableItem
              key={item.itemId}
              item={item}
              dayColor={dayColorMap.get(item.dayId) ?? '#3B82F6'}
              isSelected={selectedItemId === item.itemId}
              isExpanded={expandedId === item.itemId}
              onToggleExpand={() => setExpandedId(expandedId === item.itemId ? null : item.itemId)}
              onDelete={onDeleteItem ? () => onDeleteItem(item.itemId) : undefined}
              onUpdate={onUpdateItem ? (updates) => onUpdateItem(item.itemId, updates) : undefined}
              onClick={onItemClick ? () => onItemClick(item.itemId) : undefined}
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
