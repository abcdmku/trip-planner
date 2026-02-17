// ---------------------------------------------------------------------------
// useErrorBoundary – A hook for catching and managing errors in components.
//
// Provides error state, manual error handling, and a wrapper for async
// operations that automatically catches and surfaces thrown errors.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseErrorBoundaryReturn {
  /** The currently captured error, or `null` if none. */
  error: Error | null;

  /** Clear the captured error (e.g. when the user dismisses an alert). */
  resetError: () => void;

  /** Manually set an error (e.g. from a catch block). */
  handleError: (error: unknown) => void;

  /**
   * Wrap an async function so that any thrown error is automatically captured
   * into state. The wrapper returns `undefined` on failure so callers don't
   * need their own try/catch.
   *
   * @example
   * const { withErrorHandling } = useErrorBoundary();
   * const safeSave = withErrorHandling(async () => { await save(); });
   * <button onClick={safeSave}>Save</button>
   */
  withErrorHandling: <T>(fn: () => Promise<T>) => () => Promise<T | undefined>;
}

// ---------------------------------------------------------------------------
// useErrorBoundary
// ---------------------------------------------------------------------------

/**
 * A lightweight hook for managing error state in functional components.
 *
 * Unlike a class-based React Error Boundary, this hook is designed for
 * catching errors from event handlers and async operations (which Error
 * Boundaries cannot catch). It pairs well with an Error Boundary at a
 * higher level that catches render-time errors.
 *
 * @example
 * function MyComponent() {
 *   const { error, resetError, withErrorHandling } = useErrorBoundary();
 *
 *   const handleSave = withErrorHandling(async () => {
 *     await api.save(data);
 *   });
 *
 *   return (
 *     <>
 *       {error && (
 *         <div className="error-banner">
 *           {error.message}
 *           <button onClick={resetError}>Dismiss</button>
 *         </div>
 *       )}
 *       <button onClick={handleSave}>Save</button>
 *     </>
 *   );
 * }
 */
export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else if (typeof err === 'string') {
      setError(new Error(err));
    } else {
      setError(new Error('An unknown error occurred'));
    }
  }, []);

  const withErrorHandling = useCallback(
    <T,>(fn: () => Promise<T>) => {
      return async (): Promise<T | undefined> => {
        try {
          return await fn();
        } catch (err) {
          handleError(err);
          return undefined;
        }
      };
    },
    [handleError],
  );

  return { error, resetError, handleError, withErrorHandling };
}
