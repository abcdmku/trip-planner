// ---------------------------------------------------------------------------
// useOptimizer – React hook wrapping the optimizer service.
//
// Provides state management for the optimization preview workflow:
//   1. User triggers optimize() with a mode.
//   2. Hook runs the optimizer and stores the preview result.
//   3. User inspects the preview (orderedItems, droppedItems, legs).
//   4. User calls applyOptimization() to persist the changes, or
//      clearPreview() to discard.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { optimizerService, type OptimizeResult } from '@/services/optimizer-service';
import type { Item, Day, TransportMode } from '@/types/trip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OptimizerMode = 'maximize' | 'minimize';

export interface UseOptimizerReturn {
  /** The active optimization mode, or null if idle. */
  mode: OptimizerMode | null;
  /** The preview result from the last optimization run. */
  previewResult: OptimizeResult | null;
  /** Whether the optimizer is currently running. */
  isOptimizing: boolean;
  /** Error from the most recent optimization attempt. */
  error: Error | null;
  /**
   * Run the optimizer with the given parameters.
   * Stores the result in `previewResult` for inspection before applying.
   */
  optimize: (
    items: Item[],
    day: Day,
    mode: OptimizerMode,
    defaultMode: TransportMode,
  ) => Promise<void>;
  /**
   * Apply the current preview result.
   * Returns the ordered items so the caller can persist them (e.g. via
   * useReorderItems / useUpdateItem).
   */
  applyOptimization: () => OptimizeResult | null;
  /** Clear the preview state and reset to idle. */
  clearPreview: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOptimizer(): UseOptimizerReturn {
  const [mode, setMode] = useState<OptimizerMode | null>(null);
  const [previewResult, setPreviewResult] = useState<OptimizeResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // -----------------------------------------------------------------------
  // optimize
  // -----------------------------------------------------------------------

  const optimize = useCallback(
    async (
      items: Item[],
      day: Day,
      optimizerMode: OptimizerMode,
      defaultMode: TransportMode,
    ): Promise<void> => {
      setIsOptimizing(true);
      setError(null);
      setMode(optimizerMode);
      setPreviewResult(null);

      try {
        let result: OptimizeResult;

        if (optimizerMode === 'maximize') {
          result = await optimizerService.maximizeActivities(items, day, defaultMode);
        } else {
          result = await optimizerService.minimizeTravelTime(items, day, defaultMode);
        }

        setPreviewResult(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setMode(null);
      } finally {
        setIsOptimizing(false);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // applyOptimization
  // -----------------------------------------------------------------------

  const applyOptimization = useCallback((): OptimizeResult | null => {
    if (!previewResult) {
      return null;
    }

    // Return the result so the caller can persist via useReorderItems /
    // useUpdateItem.  We clear the preview after applying.
    const result = previewResult;
    setPreviewResult(null);
    setMode(null);
    setError(null);

    return result;
  }, [previewResult]);

  // -----------------------------------------------------------------------
  // clearPreview
  // -----------------------------------------------------------------------

  const clearPreview = useCallback(() => {
    setPreviewResult(null);
    setMode(null);
    setError(null);
    setIsOptimizing(false);
  }, []);

  return {
    mode,
    previewResult,
    isOptimizing,
    error,
    optimize,
    applyOptimization,
    clearPreview,
  };
}
