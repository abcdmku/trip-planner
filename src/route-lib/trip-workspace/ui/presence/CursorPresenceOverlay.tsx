import { CursorPresenceOverlay as CursorPresenceOverlayView } from '@component-lib/presence/CursorPresenceOverlay';
import type { PresenceCursor } from '@/types/api';
import { useRemoteCursorInterpolation } from '@/hooks/useRemoteCursorInterpolation';

interface CursorPresenceOverlayProps {
  cursors: PresenceCursor[];
  currentConnectionId?: string | null;
}

export function CursorPresenceOverlay({
  cursors,
  currentConnectionId,
}: CursorPresenceOverlayProps) {
  const interpolatedCursors = useRemoteCursorInterpolation(cursors, currentConnectionId);

  return <CursorPresenceOverlayView cursors={interpolatedCursors} />;
}
