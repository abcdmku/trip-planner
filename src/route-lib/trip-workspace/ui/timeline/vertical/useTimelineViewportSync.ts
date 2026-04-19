import { useCallback, useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { PresenceViewport } from '@/types/collaboration';
import { PX_PER_MIN } from './constants';
import type { ViewMode } from './types';

export function useTimelineViewportSync({
  viewMode,
  effectiveDayId,
  pxPerMin,
  onViewportChange,
  followViewport,
  jumpToViewport,
  onJumpApplied,
  scrollerRef,
  dayModeContainerRef,
  setViewMode,
  setFocusedDayId,
  updateZoom,
}: {
  viewMode: ViewMode;
  effectiveDayId: string | null;
  pxPerMin: number;
  onViewportChange?: (viewport: Omit<PresenceViewport, 'connectionId' | 'tripId' | 'userId' | 'updatedAt'>) => void;
  followViewport?: PresenceViewport | null;
  jumpToViewport?: { key: string; viewport: PresenceViewport } | null;
  onJumpApplied?: (key: string) => void;
  scrollerRef: RefObject<HTMLDivElement>;
  dayModeContainerRef: RefObject<HTMLDivElement>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  setFocusedDayId: Dispatch<SetStateAction<string | null>>;
  updateZoom: (next: number) => void;
}) {
  const applyingRemoteViewportRef = useRef(false);
  const lastAppliedFollowViewportSignatureRef = useRef<string | null>(null);

  const publishViewport = useCallback(() => {
    if (!onViewportChange || applyingRemoteViewportRef.current) return;
    const container = viewMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
    onViewportChange({
      viewMode,
      focusedDayId: effectiveDayId,
      scrollLeft: container?.scrollLeft ?? 0,
      scrollTop: container?.scrollTop ?? 0,
      zoom: pxPerMin / PX_PER_MIN,
    });
  }, [dayModeContainerRef, effectiveDayId, onViewportChange, pxPerMin, scrollerRef, viewMode]);

  useEffect(() => {
    publishViewport();
  }, [publishViewport]);

  useEffect(() => {
    const container = viewMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      publishViewport();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [dayModeContainerRef, publishViewport, scrollerRef, viewMode]);

  const applyViewport = useCallback(
    (viewport: PresenceViewport | null | undefined, behavior: ScrollBehavior = 'auto') => {
      if (!viewport) return;

      const targetMode =
        viewport.selectedDayId != null
          ? 'day'
          : viewport.viewMode === 'day' || viewport.viewMode === 'multi'
            ? viewport.viewMode
            : 'multi';
      const targetDayId = viewport.selectedDayId ?? viewport.focusedDayId;

      applyingRemoteViewportRef.current = true;
      setViewMode(targetMode);
      if (targetDayId) {
        setFocusedDayId(targetDayId);
      }
      updateZoom(viewport.zoom * PX_PER_MIN);

      requestAnimationFrame(() => {
        const container = targetMode === 'multi' ? scrollerRef.current : dayModeContainerRef.current;
        container?.scrollTo({
          left: viewport.scrollLeft,
          top: viewport.scrollTop,
          behavior,
        });
        window.setTimeout(() => {
          applyingRemoteViewportRef.current = false;
        }, 220);
      });
    },
    [dayModeContainerRef, scrollerRef, setFocusedDayId, setViewMode, updateZoom],
  );

  useEffect(() => {
    if (!followViewport) {
      lastAppliedFollowViewportSignatureRef.current = null;
      return;
    }

    const signature = [
      followViewport.connectionId,
      followViewport.viewMode,
      followViewport.focusedDayId ?? '',
      followViewport.selectedDayId ?? '',
      followViewport.scrollLeft,
      followViewport.scrollTop,
      followViewport.zoom,
    ].join('|');

    if (lastAppliedFollowViewportSignatureRef.current === signature) return;

    lastAppliedFollowViewportSignatureRef.current = signature;
    applyViewport(followViewport, 'auto');
  }, [applyViewport, followViewport]);

  useEffect(() => {
    if (!jumpToViewport) return;
    applyViewport(jumpToViewport.viewport, 'smooth');
    onJumpApplied?.(jumpToViewport.key);
  }, [applyViewport, jumpToViewport, onJumpApplied]);
}
