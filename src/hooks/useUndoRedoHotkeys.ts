import { useHotkey } from '@tanstack/react-hotkeys';
import { useUndoRedo } from '@/hooks/useUndoRedo';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const editableAncestor = target.closest(
    'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
  );
  return Boolean(editableAncestor);
}

export function useUndoRedoHotkeys(tripId: string) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo(tripId);

  useHotkey(
    'Mod+Z',
    (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.shiftKey) return; // Mod+Shift+Z is redo
      if (isEditableTarget(keyboardEvent.target)) return;
      if (!canUndo()) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      void undo();
    },
    { enabled: Boolean(tripId), conflictBehavior: 'allow' },
  );

  useHotkey(
    'Mod+Shift+Z',
    (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (isEditableTarget(keyboardEvent.target)) return;
      if (!canRedo()) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      void redo();
    },
    { enabled: Boolean(tripId), conflictBehavior: 'allow' },
  );

  useHotkey(
    'Mod+Y',
    (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (isEditableTarget(keyboardEvent.target)) return;
      if (!canRedo()) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      void redo();
    },
    { enabled: Boolean(tripId), conflictBehavior: 'allow' },
  );
}

