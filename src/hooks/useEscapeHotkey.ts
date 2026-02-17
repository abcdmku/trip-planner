import { useHotkey } from '@tanstack/react-hotkeys';

/**
 * Register Escape as a close hotkey for modal/popup UIs.
 * Uses conflictBehavior=allow so multiple popup components can coexist
 * without warning logs while only enabled handlers react.
 */
export function useEscapeHotkey(enabled: boolean, onEscape: () => void): void {
  useHotkey('Escape', onEscape, {
    enabled,
    conflictBehavior: 'allow',
  });
}
