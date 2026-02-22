import type { Item } from '@/types/trip';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { ItemDetailCard } from './ItemDetailCard';

interface ItemEditorDialogProps {
  isOpen: boolean;
  item: Item | null;
  dayColor?: string;
  dayDate?: string;
  onUpdate?: (updates: Partial<Item>) => void;
  onClose: () => void;
}

export function ItemEditorDialog({
  isOpen,
  item,
  dayColor = '#3B82F6',
  dayDate,
  onUpdate,
  onClose,
}: ItemEditorDialogProps) {
  useEscapeHotkey(isOpen, onClose);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto">
        <ItemDetailCard
          item={item}
          dayColor={dayColor}
          dayDate={dayDate}
          density="comfortable"
          onUpdate={onUpdate}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
