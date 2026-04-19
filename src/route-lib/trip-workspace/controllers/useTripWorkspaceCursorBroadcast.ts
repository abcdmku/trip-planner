import { useEffect, type RefObject } from 'react';

interface UseTripWorkspaceCursorBroadcastParams {
  tripId: string;
  workspaceRef: RefObject<HTMLDivElement | null>;
  sendCursor: (tripId: string, x: number, y: number) => void;
  clearCursor: (tripId: string) => void;
}

export function useTripWorkspaceCursorBroadcast({
  tripId,
  workspaceRef,
  sendCursor,
  clearCursor,
}: UseTripWorkspaceCursorBroadcastParams) {
  useEffect(() => {
    if (!workspaceRef.current) return;

    let frame = 0;
    const workspace = workspaceRef.current;
    const clearLocalCursor = () => {
      clearCursor(tripId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        clearLocalCursor();
        return;
      }
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = workspaceRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          clearLocalCursor();
          return;
        }
        sendCursor(
          tripId,
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
        );
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearLocalCursor();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('blur', clearLocalCursor);
    workspace.addEventListener('pointerleave', clearLocalCursor);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', clearLocalCursor);
      workspace.removeEventListener('pointerleave', clearLocalCursor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearLocalCursor();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [clearCursor, sendCursor, tripId, workspaceRef]);
}
