import { useEffect, useRef, useState } from 'react';
import {
  CURSOR_FADE_AFTER_MS,
  CURSOR_INTERPOLATION_ALPHA,
  CURSOR_STALE_AFTER_MS,
} from '@/lib/collaboration/perf';
import type { PresenceCursor } from '@/types/collaboration';

interface InterpolatedCursor extends PresenceCursor {
  renderedX: number;
  renderedY: number;
  isFading: boolean;
}

interface CursorState {
  cursor: PresenceCursor;
  renderedX: number;
  renderedY: number;
  lastSeenAt: number;
}

export function useRemoteCursorInterpolation(
  cursors: PresenceCursor[],
  currentConnectionId?: string | null,
): InterpolatedCursor[] {
  const statesRef = useRef(new Map<string, CursorState>());
  const [rendered, setRendered] = useState<InterpolatedCursor[]>([]);

  useEffect(() => {
    const now = Date.now();
    const nextIds = new Set<string>();

    for (const cursor of cursors) {
      if (cursor.connectionId === currentConnectionId) continue;

      nextIds.add(cursor.connectionId);
      const existing = statesRef.current.get(cursor.connectionId);
      if (existing) {
        existing.cursor = cursor;
        existing.lastSeenAt = now;
      } else {
        statesRef.current.set(cursor.connectionId, {
          cursor,
          renderedX: cursor.x,
          renderedY: cursor.y,
          lastSeenAt: now,
        });
      }
    }

    for (const [connectionId] of statesRef.current) {
      if (!nextIds.has(connectionId)) {
        statesRef.current.delete(connectionId);
      }
    }
  }, [cursors, currentConnectionId]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const now = Date.now();
      const next: InterpolatedCursor[] = [];

      for (const [connectionId, state] of statesRef.current) {
        if (now - state.lastSeenAt > CURSOR_STALE_AFTER_MS) {
          statesRef.current.delete(connectionId);
          continue;
        }

        state.renderedX += (state.cursor.x - state.renderedX) * CURSOR_INTERPOLATION_ALPHA;
        state.renderedY += (state.cursor.y - state.renderedY) * CURSOR_INTERPOLATION_ALPHA;
        next.push({
          ...state.cursor,
          renderedX: state.renderedX,
          renderedY: state.renderedY,
          isFading: now - state.lastSeenAt > CURSOR_FADE_AFTER_MS,
        });
      }

      setRendered(next);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return rendered;
}
