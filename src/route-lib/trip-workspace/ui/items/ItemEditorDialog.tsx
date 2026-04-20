import type { Item } from '@/types/trip';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { ItemDetailCard } from './ItemDetailCard';

interface ItemEditorDialogProps {
  isOpen: boolean;
  item: Item | null;
  dayColor?: string;
  dayDate?: string;
  dayTimezoneLabel?: string | null;
  onUpdate?: (updates: Partial<Item>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ItemEditorDialog({
  isOpen,
  item,
  dayColor,
  dayDate,
  dayTimezoneLabel,
  onUpdate,
  onDelete,
  onClose,
}: ItemEditorDialogProps) {
  useEscapeHotkey(isOpen, onClose);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px]">
        <div
          className={`overflow-hidden rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg ${
            dayColor ? 'border-t-2' : ''
          }`}
          style={dayColor ? { borderTopColor: dayColor } : undefined}
        >
          <div
            className="max-h-[88vh] overflow-x-hidden overflow-y-auto overscroll-contain"
            style={{ scrollbarGutter: 'stable' }}
          >
            <ItemDetailCard
              item={item}
              dayColor={dayColor}
              dayDate={dayDate}
              dayTimezoneLabel={dayTimezoneLabel}
              density="comfortable"
              onUpdate={onUpdate}
              onDelete={onDelete}
              onClose={onClose}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}
