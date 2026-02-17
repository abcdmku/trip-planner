import { useState, useMemo, useCallback, useRef, useEffect, forwardRef } from 'react';
import { Clock, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { Item, Day } from '../../types/trip';

// ── Constants ────────────────────────────────────────────────────────────────

const PX_PER_MIN = 1.2;
const PX_PER_HR = PX_PER_MIN * 60;
const MIN_BLOCK_H = 22;
const SNAP = 5;
const GUTTER = 52;
const RESIZE_EDGE = 7;
const DRAG_THRESH = 5;
const DEFAULT_DUR = 60;

const DAY_VIEW_MIN_W = 300;
const DAY_VIEW_MAX_W = 900;
const MULTI_COL_MIN_W = 160;
const MULTI_COL_MAX_W = 220;
const TIME_AXIS_W = 52;
const MULTI_HEADER_H = 36;

const TYPE_ICON: Record<string, string> = {
  attraction: '\u{1F3DB}\uFE0F',
  restaurant: '\u{1F37D}\uFE0F',
  hotel: '\u{1F3E8}',
  transport: '\u{1F68C}',
  activity: '\u{1F3AF}',
  other: '\u{1F4CD}',
};

// ── Time helpers ─────────────────────────────────────────────────────────────

function toMins(t: string): number {
  if (!t) return 0;
  const p = t.includes('T') ? t.split('T')[1] : t;
  const [h, m] = p.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toTime(m: number): string {
  const c = Math.max(0, Math.min(1439, m));
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
}

function displayShort(t: string): string {
  const m = toMins(t);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const s = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 || 12;
  return mm ? `${h12}:${String(mm).padStart(2, '0')}${s}` : `${h12}${s}`;
}

function snapM(m: number): number {
  return Math.round(m / SNAP) * SNAP;
}

function mToY(m: number, sh: number): number {
  return (m - sh * 60) * PX_PER_MIN;
}

function hourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// ── Color helpers ────────────────────────────────────────────────────────────

function hexLum(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function blockColors(hex: string) {
  const light = hexLum(hex) > 0.55;
  return {
    text: light ? 'rgba(0,0,0,0.85)' : '#fff',
    sub: light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)',
    handle: light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.35)',
  };
}

// ── Interaction types ────────────────────────────────────────────────────────

type Interaction =
  | { type: 'idle' }
  | { type: 'creating'; startMin: number; endMin: number }
  | { type: 'moving'; itemId: string; deltaMin: number }
  | { type: 'resizing'; itemId: string; startMin: number; endMin: number };

interface PtrTrack {
  action: 'create' | 'move' | 'resize-top' | 'resize-bottom';
  anchorClientY: number;
  anchorMin: number;
  containerTop: number;
  activated: boolean;
  itemId?: string;
  origStartMin?: number;
  origEndMin?: number;
  curStartMin: number;
  curEndMin: number;
  curDelta: number;
}

// ── SingleDayTimeline ────────────────────────────────────────────────────────

interface SDTProps {
  day: Day;
  items: Item[];
  selectedItemId?: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (startTime: string, endTime: string) => void;
}

function SingleDayTimeline({
  day,
  items,
  selectedItemId,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
}: SDTProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const ptrRef = useRef<PtrTrack | null>(null);
  const rafRef = useRef(0);
  const didScrollRef = useRef(false);
  const lastClickRef = useRef<{ itemId: string; time: number } | null>(null);
  const [interaction, setInteraction] = useState<Interaction>({ type: 'idle' });

  // Stable callback refs
  const cbRef = useRef({ onUpdateItem, onItemClick, onItemDoubleClick, onCreateAtTime });
  useEffect(() => {
    cbRef.current = { onUpdateItem, onItemClick, onItemDoubleClick, onCreateAtTime };
  });

  const visible = useMemo(
    () =>
      items
        .filter((i) => i.dayId === day.dayId && i.scheduledStart)
        .sort((a, b) => {
          const t = toMins(a.scheduledStart) - toMins(b.scheduledStart);
          return t === 0 ? a.sortOrder - b.sortOrder : t;
        }),
    [day.dayId, items],
  );

  const { startH, endH } = useMemo(() => {
    let lo = Math.floor(toMins(day.dayStart || '08:00') / 60);
    let hi = Math.ceil(toMins(day.dayEnd || '22:00') / 60);
    for (const i of visible) {
      const s = toMins(i.scheduledStart);
      const e = i.scheduledEnd ? toMins(i.scheduledEnd) : s + i.durationMinutes;
      lo = Math.min(lo, Math.floor(s / 60));
      hi = Math.max(hi, Math.ceil(e / 60));
    }
    return { startH: Math.max(0, lo - 1), endH: Math.min(24, hi + 1) };
  }, [day.dayStart, day.dayEnd, visible]);

  const startHRef = useRef(startH);
  useEffect(() => {
    startHRef.current = startH;
  });

  const totalH = (endH - startH) * PX_PER_HR;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowY = nowMin >= startH * 60 && nowMin <= endH * 60 ? mToY(nowMin, startH) : null;

  // Auto-scroll on mount / day change
  useEffect(() => {
    didScrollRef.current = false;
  }, [day.dayId]);

  useEffect(() => {
    if (!scrollRef.current || didScrollRef.current) return;
    const target =
      visible.length > 0
        ? Math.max(0, mToY(toMins(visible[0].scheduledStart), startH) - 20)
        : nowY !== null
          ? Math.max(0, nowY - 100)
          : 0;
    scrollRef.current.scrollTop = target;
    didScrollRef.current = true;
  }, [startH, visible, nowY]);

  // ── Document-level pointer handlers (stable, use refs) ──

  const docMove = useCallback((e: PointerEvent) => {
    const p = ptrRef.current;
    if (!p) return;

    const dy = e.clientY - p.anchorClientY;
    if (!p.activated && Math.abs(dy) < DRAG_THRESH) return;
    p.activated = true;

    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    const rawY = e.clientY - p.containerTop + scrollTop;
    const sh = startHRef.current;
    const curMin = snapM(Math.max(0, Math.min(1440, rawY / PX_PER_MIN + sh * 60)));

    switch (p.action) {
      case 'create': {
        const lo = Math.min(p.anchorMin, curMin);
        const hi = Math.max(p.anchorMin, curMin);
        p.curStartMin = lo;
        p.curEndMin = Math.max(lo + SNAP, hi);
        setInteraction({ type: 'creating', startMin: p.curStartMin, endMin: p.curEndMin });
        break;
      }
      case 'move': {
        p.curDelta = curMin - p.anchorMin;
        setInteraction({ type: 'moving', itemId: p.itemId!, deltaMin: p.curDelta });
        break;
      }
      case 'resize-top': {
        const delta = curMin - p.anchorMin;
        p.curStartMin = Math.max(0, Math.min(p.origStartMin! + delta, p.origEndMin! - SNAP));
        setInteraction({
          type: 'resizing',
          itemId: p.itemId!,
          startMin: p.curStartMin,
          endMin: p.origEndMin!,
        });
        break;
      }
      case 'resize-bottom': {
        const delta = curMin - p.anchorMin;
        p.curEndMin = Math.min(1440, Math.max(p.origEndMin! + delta, p.origStartMin! + SNAP));
        setInteraction({
          type: 'resizing',
          itemId: p.itemId!,
          startMin: p.origStartMin!,
          endMin: p.curEndMin,
        });
        break;
      }
    }
  }, []);

  const docUp = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    document.removeEventListener('pointermove', docMove);
    document.removeEventListener('pointerup', docUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    const p = ptrRef.current;
    ptrRef.current = null;

    if (!p) {
      setInteraction({ type: 'idle' });
      return;
    }

    const cbs = cbRef.current;

    let didCommit = false;

    if (!p.activated) {
      // Click — threshold not met
      if (p.action === 'create') {
        cbs.onCreateAtTime?.(toTime(p.anchorMin), toTime(p.anchorMin + DEFAULT_DUR));
      } else if (p.itemId) {
        const now = Date.now();
        const last = lastClickRef.current;
        if (last && last.itemId === p.itemId && now - last.time < 400) {
          lastClickRef.current = null;
          cbs.onItemDoubleClick?.(p.itemId);
        } else {
          lastClickRef.current = { itemId: p.itemId, time: now };
          cbs.onItemClick?.(p.itemId);
        }
      }
    } else {
      // Drag completed
      switch (p.action) {
        case 'create':
          cbs.onCreateAtTime?.(toTime(p.curStartMin), toTime(p.curEndMin));
          break;
        case 'move':
          if (p.itemId && p.curDelta !== 0) {
            const newStart = p.origStartMin! + p.curDelta;
            const dur = p.origEndMin! - p.origStartMin!;
            cbs.onUpdateItem?.(p.itemId, {
              scheduledStart: toTime(newStart),
              scheduledEnd: toTime(newStart + dur),
            });
            didCommit = true;
          }
          break;
        case 'resize-top':
          if (p.itemId) {
            cbs.onUpdateItem?.(p.itemId, {
              scheduledStart: toTime(p.curStartMin),
              scheduledEnd: toTime(p.origEndMin!),
              durationMinutes: p.origEndMin! - p.curStartMin,
            });
            didCommit = true;
          }
          break;
        case 'resize-bottom':
          if (p.itemId) {
            cbs.onUpdateItem?.(p.itemId, {
              scheduledStart: toTime(p.origStartMin!),
              scheduledEnd: toTime(p.curEndMin),
              durationMinutes: p.curEndMin - p.origStartMin!,
            });
            didCommit = true;
          }
          break;
      }
    }

    if (didCommit) {
      // Keep the visual override for one frame so the optimistic update
      // from TanStack Query propagates before we snap back to item data.
      requestAnimationFrame(() => setInteraction({ type: 'idle' }));
    } else {
      setInteraction({ type: 'idle' });
    }
  }, [docMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', docMove);
      document.removeEventListener('pointerup', docUp);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [docMove, docUp]);

  // ── Start tracking ──

  const beginTrack = useCallback(
    (
      action: PtrTrack['action'],
      e: React.PointerEvent,
      itemId?: string,
      origStart?: number,
      origEnd?: number,
    ) => {
      e.preventDefault();
      const rect = contentRef.current!.getBoundingClientRect();
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      const rawY = e.clientY - rect.top + scrollTop;
      const sh = startHRef.current;
      const anchorMin = snapM(Math.max(0, Math.min(1440, rawY / PX_PER_MIN + sh * 60)));

      const cursor =
        action === 'create'
          ? 'crosshair'
          : action === 'move'
            ? 'grabbing'
            : 'ns-resize';
      document.body.style.cursor = cursor;
      document.body.style.userSelect = 'none';

      ptrRef.current = {
        action,
        anchorClientY: e.clientY,
        anchorMin,
        containerTop: rect.top,
        activated: false,
        itemId,
        origStartMin: origStart,
        origEndMin: origEnd,
        curStartMin: origStart ?? anchorMin,
        curEndMin: origEnd ?? anchorMin + DEFAULT_DUR,
        curDelta: 0,
      };

      document.addEventListener('pointermove', docMove);
      document.addEventListener('pointerup', docUp);
    },
    [docMove, docUp],
  );

  // ── Background pointer down → create ──

  const handleBgDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      beginTrack('create', e);
    },
    [beginTrack],
  );

  // ── Item pointer down → move or resize ──

  const handleItemDown = useCallback(
    (e: React.PointerEvent, item: Item) => {
      if (e.button !== 0) return;
      e.stopPropagation(); // prevent background handler

      const rect = e.currentTarget.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const blockH = rect.height;

      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd
        ? toMins(item.scheduledEnd)
        : startMin + item.durationMinutes;

      if (relY < RESIZE_EDGE && blockH > 30) {
        beginTrack('resize-top', e, item.itemId, startMin, endMin);
      } else if (blockH - relY < RESIZE_EDGE && blockH > 30) {
        beginTrack('resize-bottom', e, item.itemId, startMin, endMin);
      } else {
        beginTrack('move', e, item.itemId, startMin, endMin);
      }
    },
    [beginTrack],
  );

  // ── Compute item visual position based on interaction state ──

  function itemPos(item: Item) {
    const startMin = toMins(item.scheduledStart);
    const endMin = item.scheduledEnd
      ? toMins(item.scheduledEnd)
      : startMin + item.durationMinutes;

    let vStart = startMin;
    let vEnd = endMin;
    let active = false;

    if (interaction.type === 'moving' && interaction.itemId === item.itemId) {
      vStart = startMin + interaction.deltaMin;
      vEnd = endMin + interaction.deltaMin;
      active = true;
    } else if (interaction.type === 'resizing' && interaction.itemId === item.itemId) {
      vStart = interaction.startMin;
      vEnd = interaction.endMin;
      active = true;
    }

    return {
      top: mToY(vStart, startH),
      height: Math.max(MIN_BLOCK_H, (vEnd - vStart) * PX_PER_MIN),
      startMin: vStart,
      endMin: vEnd,
      active,
    };
  }

  // ── Render ──

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden">
      <div
        ref={contentRef}
        className="relative select-none"
        style={{ height: totalH, minHeight: '100%' }}
        onPointerDown={handleBgDown}
      >
        {/* Gutter line */}
        <div
          className="absolute bottom-0 top-0 w-px"
          style={{ left: GUTTER, backgroundColor: 'rgb(var(--color-border) / 0.08)' }}
        />

        {/* Hour lines + labels */}
        {hours.map((hr) => {
          const y = (hr - startH) * PX_PER_HR;
          return (
            <div key={hr}>
              <div
                className="absolute flex items-center justify-end pr-2"
                style={{ left: 0, width: GUTTER, top: y - 7 }}
              >
                <span className="select-none text-[10px] font-medium tabular-nums text-theme-tertiary opacity-50">
                  {hourLabel(hr)}
                </span>
              </div>
              <div
                className="absolute h-px"
                style={{
                  top: y,
                  left: GUTTER,
                  right: 0,
                  backgroundColor: 'rgb(var(--color-border) / 0.06)',
                }}
              />
            </div>
          );
        })}

        {/* 15-min sub-lines */}
        {hours.slice(0, -1).flatMap((hr) =>
          [1, 2, 3].map((q) => (
            <div
              key={`q-${hr}-${q}`}
              className="absolute h-px"
              style={{
                top: (hr - startH) * PX_PER_HR + (q * PX_PER_HR) / 4,
                left: GUTTER,
                right: 0,
                backgroundColor:
                  q === 2
                    ? 'rgb(var(--color-border) / 0.04)'
                    : 'rgb(var(--color-border) / 0.025)',
              }}
            />
          )),
        )}

        {/* Current time indicator */}
        {nowY !== null && (
          <>
            <div
              className="absolute z-30 rounded-full bg-red-500"
              style={{ top: nowY - 3.5, left: GUTTER - 7, width: 7, height: 7 }}
            />
            <div
              className="absolute z-30 bg-red-500"
              style={{ top: nowY - 0.5, left: GUTTER, right: 0, height: 1.5, borderRadius: 1 }}
            />
          </>
        )}

        {/* Item blocks */}
        {visible.map((item) => {
          const pos = itemPos(item);
          const isSelected = selectedItemId === item.itemId;
          const colors = blockColors(day.colorHex);
          const emoji = TYPE_ICON[item.type] || '\u{1F4CD}';

          return (
            <div
              key={item.itemId}
              className="absolute"
              style={{
                top: pos.top,
                left: GUTTER + 2,
                right: 4,
                height: pos.height,
                zIndex: pos.active ? 50 : isSelected ? 10 : 1,
              }}
              onPointerDown={(e) => handleItemDown(e, item)}
            >
              <div
                className={`group relative h-full overflow-hidden rounded-md transition-shadow duration-100 ${
                  pos.active
                    ? 'shadow-lg ring-2 ring-white/60'
                    : isSelected
                      ? 'shadow-md ring-2 ring-white/70 ring-offset-1 ring-offset-black/10'
                      : 'shadow-sm hover:shadow-md'
                }`}
                style={{ backgroundColor: day.colorHex }}
              >
                {/* Top resize cursor zone */}
                <div className="absolute inset-x-0 top-0 z-10 h-[7px] cursor-n-resize" />

                {/* Content */}
                <div className="flex h-full cursor-grab items-start px-2 py-1 active:cursor-grabbing">
                  <div className="pointer-events-none flex min-w-0 flex-col">
                    <div className="flex items-center gap-1">
                      <span className="flex-shrink-0 text-[10px] leading-none">{emoji}</span>
                      <span
                        className="truncate text-[11px] font-semibold leading-tight"
                        style={{ color: colors.text }}
                      >
                        {item.placeName}
                      </span>
                    </div>
                    {pos.height >= 36 && (
                      <span
                        className="mt-0.5 truncate text-[9px] leading-tight"
                        style={{ color: colors.sub }}
                      >
                        {displayShort(toTime(pos.startMin))} –{' '}
                        {displayShort(toTime(pos.endMin))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom resize cursor zone */}
                <div className="absolute inset-x-0 bottom-0 z-10 h-[7px] cursor-s-resize" />

                {/* Resize handle indicators (visible on hover) */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className="h-[2.5px] w-5 rounded-full"
                    style={{ backgroundColor: colors.handle }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className="h-[2.5px] w-5 rounded-full"
                    style={{ backgroundColor: colors.handle }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Creation ghost */}
        {interaction.type === 'creating' && (
          <div
            className="absolute z-40 rounded-md border-2 border-dashed"
            style={{
              top: mToY(interaction.startMin, startH),
              left: GUTTER + 2,
              right: 4,
              height: Math.max(
                MIN_BLOCK_H,
                (interaction.endMin - interaction.startMin) * PX_PER_MIN,
              ),
              backgroundColor: `${day.colorHex}30`,
              borderColor: `${day.colorHex}90`,
            }}
          >
            <div className="px-2 py-1">
              <span className="text-[10px] font-semibold" style={{ color: day.colorHex }}>
                {displayShort(toTime(interaction.startMin))} –{' '}
                {displayShort(toTime(interaction.endMin))}
              </span>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {visible.length === 0 && interaction.type === 'idle' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 opacity-30">
              <Clock className="h-6 w-6 text-theme-tertiary" />
              <p className="text-[11px] text-theme-tertiary">Click to add an item</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MultiDayColumn ───────────────────────────────────────────────────────────

interface MultiDayColumnProps {
  day: Day;
  dayItems: Item[];
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
  isActive: boolean;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, start: string, end: string) => void;
  onFocusDay: () => void;
}

const MultiDayColumn = forwardRef<HTMLDivElement, MultiDayColumnProps>(
  function MultiDayColumn(
    {
      day,
      dayItems,
      globalStartH,
      globalEndH,
      gTotalH,
      gHours,
      nowMin,
      selectedItemId,
      isActive,
      scrollerRef,
      onUpdateItem,
      onItemClick,
      onItemDoubleClick,
      onCreateAtTime,
      onFocusDay,
    },
    ref,
  ) {
    const contentRef = useRef<HTMLDivElement>(null);
    const ptrRef = useRef<PtrTrack | null>(null);
    const rafRef = useRef(0);
    const lastClickRef = useRef<{ itemId: string; time: number } | null>(null);
    const [interaction, setInteraction] = useState<Interaction>({ type: 'idle' });

    const startHRef = useRef(globalStartH);
    useEffect(() => {
      startHRef.current = globalStartH;
    });

    const cbRef = useRef({ onUpdateItem, onItemClick, onItemDoubleClick, onCreateAtTime });
    useEffect(() => {
      cbRef.current = { onUpdateItem, onItemClick, onItemDoubleClick, onCreateAtTime };
    });

    const docMove = useCallback((e: PointerEvent) => {
      const p = ptrRef.current;
      if (!p) return;

      const dy = e.clientY - p.anchorClientY;
      if (!p.activated && Math.abs(dy) < DRAG_THRESH) return;
      p.activated = true;

      const scrollTop = scrollerRef.current?.scrollTop ?? 0;
      const rawY = e.clientY - p.containerTop + scrollTop;
      const sh = startHRef.current;
      const curMin = snapM(Math.max(0, Math.min(1440, rawY / PX_PER_MIN + sh * 60)));

      switch (p.action) {
        case 'create': {
          const lo = Math.min(p.anchorMin, curMin);
          const hi = Math.max(p.anchorMin, curMin);
          p.curStartMin = lo;
          p.curEndMin = Math.max(lo + SNAP, hi);
          setInteraction({ type: 'creating', startMin: p.curStartMin, endMin: p.curEndMin });
          break;
        }
        case 'move': {
          p.curDelta = curMin - p.anchorMin;
          setInteraction({ type: 'moving', itemId: p.itemId!, deltaMin: p.curDelta });
          break;
        }
        case 'resize-top': {
          const delta = curMin - p.anchorMin;
          p.curStartMin = Math.max(0, Math.min(p.origStartMin! + delta, p.origEndMin! - SNAP));
          setInteraction({
            type: 'resizing',
            itemId: p.itemId!,
            startMin: p.curStartMin,
            endMin: p.origEndMin!,
          });
          break;
        }
        case 'resize-bottom': {
          const delta = curMin - p.anchorMin;
          p.curEndMin = Math.min(1440, Math.max(p.origEndMin! + delta, p.origStartMin! + SNAP));
          setInteraction({
            type: 'resizing',
            itemId: p.itemId!,
            startMin: p.origStartMin!,
            endMin: p.curEndMin,
          });
          break;
        }
      }
    }, [scrollerRef]);

    const docUp = useCallback(() => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('pointermove', docMove);
      document.removeEventListener('pointerup', docUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const p = ptrRef.current;
      ptrRef.current = null;

      if (!p) {
        setInteraction({ type: 'idle' });
        return;
      }

      const cbs = cbRef.current;
      const dayId = day.dayId;
      let didCommit = false;

      if (!p.activated) {
        if (p.action === 'create') {
          cbs.onCreateAtTime?.(dayId, toTime(p.anchorMin), toTime(p.anchorMin + DEFAULT_DUR));
        } else if (p.itemId) {
          const now = Date.now();
          const last = lastClickRef.current;
          if (last && last.itemId === p.itemId && now - last.time < 400) {
            lastClickRef.current = null;
            cbs.onItemDoubleClick?.(p.itemId);
          } else {
            lastClickRef.current = { itemId: p.itemId, time: now };
            cbs.onItemClick?.(p.itemId);
          }
        }
      } else {
        switch (p.action) {
          case 'create':
            cbs.onCreateAtTime?.(dayId, toTime(p.curStartMin), toTime(p.curEndMin));
            break;
          case 'move':
            if (p.itemId && p.curDelta !== 0) {
              const newStart = p.origStartMin! + p.curDelta;
              const dur = p.origEndMin! - p.origStartMin!;
              cbs.onUpdateItem?.(p.itemId, {
                scheduledStart: toTime(newStart),
                scheduledEnd: toTime(newStart + dur),
              });
              didCommit = true;
            }
            break;
          case 'resize-top':
            if (p.itemId) {
              cbs.onUpdateItem?.(p.itemId, {
                scheduledStart: toTime(p.curStartMin),
                scheduledEnd: toTime(p.origEndMin!),
                durationMinutes: p.origEndMin! - p.curStartMin,
              });
              didCommit = true;
            }
            break;
          case 'resize-bottom':
            if (p.itemId) {
              cbs.onUpdateItem?.(p.itemId, {
                scheduledStart: toTime(p.origStartMin!),
                scheduledEnd: toTime(p.curEndMin),
                durationMinutes: p.curEndMin - p.origStartMin!,
              });
              didCommit = true;
            }
            break;
        }
      }

      if (didCommit) {
        requestAnimationFrame(() => setInteraction({ type: 'idle' }));
      } else {
        setInteraction({ type: 'idle' });
      }
    }, [docMove, day.dayId]);

    useEffect(() => {
      return () => {
        document.removeEventListener('pointermove', docMove);
        document.removeEventListener('pointerup', docUp);
        cancelAnimationFrame(rafRef.current);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }, [docMove, docUp]);

    const beginTrack = useCallback(
      (
        action: PtrTrack['action'],
        e: React.PointerEvent,
        itemId?: string,
        origStart?: number,
        origEnd?: number,
      ) => {
        e.preventDefault();
        const rect = contentRef.current!.getBoundingClientRect();
        const scrollTop = scrollerRef.current?.scrollTop ?? 0;
        const rawY = e.clientY - rect.top + scrollTop;
        const sh = startHRef.current;
        const anchorMin = snapM(Math.max(0, Math.min(1440, rawY / PX_PER_MIN + sh * 60)));

        const cursor =
          action === 'create'
            ? 'crosshair'
            : action === 'move'
              ? 'grabbing'
              : 'ns-resize';
        document.body.style.cursor = cursor;
        document.body.style.userSelect = 'none';

        ptrRef.current = {
          action,
          anchorClientY: e.clientY,
          anchorMin,
          containerTop: rect.top,
          activated: false,
          itemId,
          origStartMin: origStart,
          origEndMin: origEnd,
          curStartMin: origStart ?? anchorMin,
          curEndMin: origEnd ?? anchorMin + DEFAULT_DUR,
          curDelta: 0,
        };

        document.addEventListener('pointermove', docMove);
        document.addEventListener('pointerup', docUp);
      },
      [docMove, docUp, scrollerRef],
    );

    const handleBgDown = useCallback(
      (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        beginTrack('create', e);
      },
      [beginTrack],
    );

    const handleItemDown = useCallback(
      (e: React.PointerEvent, item: Item) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const blockH = rect.height;

        const startMin = toMins(item.scheduledStart);
        const endMin = item.scheduledEnd
          ? toMins(item.scheduledEnd)
          : startMin + item.durationMinutes;

        if (relY < RESIZE_EDGE && blockH > 30) {
          beginTrack('resize-top', e, item.itemId, startMin, endMin);
        } else if (blockH - relY < RESIZE_EDGE && blockH > 30) {
          beginTrack('resize-bottom', e, item.itemId, startMin, endMin);
        } else {
          beginTrack('move', e, item.itemId, startMin, endMin);
        }
      },
      [beginTrack],
    );

    function itemPos(item: Item) {
      const startMin = toMins(item.scheduledStart);
      const endMin = item.scheduledEnd
        ? toMins(item.scheduledEnd)
        : startMin + item.durationMinutes;

      let vStart = startMin;
      let vEnd = endMin;
      let active = false;

      if (interaction.type === 'moving' && interaction.itemId === item.itemId) {
        vStart = startMin + interaction.deltaMin;
        vEnd = endMin + interaction.deltaMin;
        active = true;
      } else if (interaction.type === 'resizing' && interaction.itemId === item.itemId) {
        vStart = interaction.startMin;
        vEnd = interaction.endMin;
        active = true;
      }

      return {
        top: mToY(vStart, globalStartH),
        height: Math.max(MIN_BLOCK_H, (vEnd - vStart) * PX_PER_MIN),
        startMin: vStart,
        endMin: vEnd,
        active,
      };
    }

    const colors = blockColors(day.colorHex);

    return (
      <div
        ref={ref}
        className={`flex-shrink-0 overflow-hidden rounded-lg border ${
          isActive ? 'border-accent/50 shadow-theme-md' : 'border-theme'
        }`}
        style={{
          width: `clamp(${MULTI_COL_MIN_W}px, 20vw, ${MULTI_COL_MAX_W}px)`,
        }}
      >
        {/* Sticky day header */}
        <button
          type="button"
          onClick={onFocusDay}
          className={`sticky top-0 z-10 flex w-full items-center justify-between border-b px-2 py-1.5 text-left transition-colors ${
            isActive
              ? 'border-accent/40 bg-accent/5'
              : 'border-theme bg-theme hover:bg-theme-subtle/60'
          }`}
          style={{ height: MULTI_HEADER_H }}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: day.colorHex }}
            />
            <span className="truncate text-[10px] font-semibold text-theme">
              {day.label}
            </span>
          </div>
          <span className="ml-1 flex-shrink-0 text-[9px] text-theme-tertiary">
            {day.date}
          </span>
        </button>

        {/* Content area */}
        <div
          ref={contentRef}
          className="relative cursor-crosshair select-none bg-theme"
          style={{ height: gTotalH }}
          onPointerDown={handleBgDown}
        >
          {/* Hour grid lines */}
          {gHours.map((hr) => (
            <div
              key={hr}
              className="absolute h-px"
              style={{
                top: (hr - globalStartH) * PX_PER_HR,
                left: 0,
                right: 0,
                backgroundColor: 'rgb(var(--color-border) / 0.06)',
              }}
            />
          ))}
          {/* 15-min sub-lines */}
          {gHours.slice(0, -1).flatMap((hr) =>
            [1, 2, 3].map((q) => (
              <div
                key={`q-${hr}-${q}`}
                className="absolute h-px"
                style={{
                  top: (hr - globalStartH) * PX_PER_HR + (q * PX_PER_HR) / 4,
                  left: 0,
                  right: 0,
                  backgroundColor:
                    q === 2
                      ? 'rgb(var(--color-border) / 0.04)'
                      : 'rgb(var(--color-border) / 0.025)',
                }}
              />
            )),
          )}

          {/* Current time indicator */}
          {nowMin >= globalStartH * 60 && nowMin <= globalEndH * 60 && (
            <div
              className="absolute z-30 bg-red-500"
              style={{
                top: mToY(nowMin, globalStartH) - 0.5,
                left: 0,
                right: 0,
                height: 1.5,
                borderRadius: 1,
              }}
            />
          )}

          {/* Items */}
          {dayItems.map((item) => {
            const pos = itemPos(item);
            const isSelected = selectedItemId === item.itemId;
            const emoji = TYPE_ICON[item.type] || '\u{1F4CD}';

            return (
              <div
                key={item.itemId}
                className="absolute"
                style={{
                  top: pos.top,
                  left: 2,
                  right: 2,
                  height: pos.height,
                  zIndex: pos.active ? 50 : isSelected ? 10 : 1,
                }}
                onPointerDown={(e) => handleItemDown(e, item)}
              >
                <div
                  className={`group relative h-full overflow-hidden rounded-md transition-shadow duration-100 ${
                    pos.active
                      ? 'shadow-lg ring-2 ring-white/60'
                      : isSelected
                        ? 'shadow-md ring-2 ring-white/70 ring-offset-1 ring-offset-black/10'
                        : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{ backgroundColor: day.colorHex }}
                >
                  {/* Top resize cursor zone */}
                  <div className="absolute inset-x-0 top-0 z-10 h-[7px] cursor-n-resize" />

                  {/* Content */}
                  <div className="flex h-full cursor-grab items-start px-1.5 py-0.5 active:cursor-grabbing">
                    <div className="pointer-events-none flex min-w-0 flex-col">
                      <div className="flex items-center gap-0.5">
                        <span className="flex-shrink-0 text-[9px] leading-none">{emoji}</span>
                        <span
                          className="truncate text-[10px] font-semibold leading-tight"
                          style={{ color: colors.text }}
                        >
                          {item.placeName}
                        </span>
                      </div>
                      {pos.height >= 32 && (
                        <span
                          className="mt-0.5 truncate text-[8px] leading-tight"
                          style={{ color: colors.sub }}
                        >
                          {displayShort(toTime(pos.startMin))} –{' '}
                          {displayShort(toTime(pos.endMin))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom resize cursor zone */}
                  <div className="absolute inset-x-0 bottom-0 z-10 h-[7px] cursor-s-resize" />

                  {/* Resize handle indicators (visible on hover) */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                    <div
                      className="h-[2.5px] w-5 rounded-full"
                      style={{ backgroundColor: colors.handle }}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                    <div
                      className="h-[2.5px] w-5 rounded-full"
                      style={{ backgroundColor: colors.handle }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Creation ghost */}
          {interaction.type === 'creating' && (
            <div
              className="absolute z-40 rounded-md border-2 border-dashed"
              style={{
                top: mToY(interaction.startMin, globalStartH),
                left: 2,
                right: 2,
                height: Math.max(
                  MIN_BLOCK_H,
                  (interaction.endMin - interaction.startMin) * PX_PER_MIN,
                ),
                backgroundColor: `${day.colorHex}30`,
                borderColor: `${day.colorHex}90`,
              }}
            >
              <div className="px-1.5 py-0.5">
                <span className="text-[9px] font-semibold" style={{ color: day.colorHex }}>
                  {displayShort(toTime(interaction.startMin))} –{' '}
                  {displayShort(toTime(interaction.endMin))}
                </span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {dayItems.length === 0 && interaction.type === 'idle' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Clock className="h-4 w-4 text-theme-tertiary opacity-20" />
            </div>
          )}
        </div>
      </div>
    );
  },
);

// ── VerticalTimeline (exported) ──────────────────────────────────────────────

type ViewMode = 'day' | 'multi';

interface VerticalTimelineProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
  selectedItemId?: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, startTime: string, endTime: string) => void;
}

export function VerticalTimeline({
  items,
  days,
  selectedDayIds = [],
  selectedItemId = null,
  onUpdateItem,
  onItemClick,
  onItemDoubleClick,
  onCreateAtTime,
}: VerticalTimelineProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('multi');
  const [focusedDayId, setFocusedDayId] = useState<string | null>(
    selectedDayIds[0] ?? days[0]?.dayId ?? null,
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const orderedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );

  const selectedTimelineItem = useMemo(
    () =>
      selectedItemId
        ? items.find((item) => item.itemId === selectedItemId && Boolean(item.scheduledStart)) ?? null
        : null,
    [items, selectedItemId],
  );

  const handleRemoveFromTimeline = useCallback(() => {
    if (!selectedTimelineItem || !onUpdateItem) return;
    onUpdateItem(selectedTimelineItem.itemId, {
      scheduledStart: '',
      scheduledEnd: '',
    });
  }, [onUpdateItem, selectedTimelineItem]);

  useHotkey('Delete', handleRemoveFromTimeline, {
    target: rootRef,
    enabled: Boolean(selectedTimelineItem) && Boolean(onUpdateItem),
    conflictBehavior: 'allow',
  });

  useHotkey('Backspace', handleRemoveFromTimeline, {
    target: rootRef,
    enabled: Boolean(selectedTimelineItem) && Boolean(onUpdateItem),
    conflictBehavior: 'allow',
  });

  // Global time range for multi-view (shared across all day columns)
  const globalRange = useMemo(() => {
    let lo = 24;
    let hi = 0;
    for (const d of orderedDays) {
      lo = Math.min(lo, Math.floor(toMins(d.dayStart || '08:00') / 60));
      hi = Math.max(hi, Math.ceil(toMins(d.dayEnd || '22:00') / 60));
    }
    for (const item of items) {
      if (!item.scheduledStart) continue;
      if (!orderedDays.some((d) => d.dayId === item.dayId)) continue;
      const s = toMins(item.scheduledStart);
      const e = item.scheduledEnd ? toMins(item.scheduledEnd) : s + item.durationMinutes;
      lo = Math.min(lo, Math.floor(s / 60));
      hi = Math.max(hi, Math.ceil(e / 60));
    }
    return { startH: Math.max(0, lo - 1), endH: Math.min(24, hi + 1) };
  }, [orderedDays, items]);

  const gTotalH = (globalRange.endH - globalRange.startH) * PX_PER_HR;
  const gHours = useMemo(
    () =>
      Array.from(
        { length: globalRange.endH - globalRange.startH + 1 },
        (_, i) => globalRange.startH + i,
      ),
    [globalRange.startH, globalRange.endH],
  );

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const selectedDayId = selectedDayIds.length === 1 ? selectedDayIds[0] : null;
  const effectiveDayId = selectedDayId ?? focusedDayId ?? orderedDays[0]?.dayId ?? null;
  const effectiveDayIndex = orderedDays.findIndex((d) => d.dayId === effectiveDayId);

  useEffect(() => {
    if (!orderedDays.length) {
      if (focusedDayId !== null) setFocusedDayId(null);
      return;
    }
    if (selectedDayId) {
      if (focusedDayId !== selectedDayId) setFocusedDayId(selectedDayId);
      return;
    }
    const has = focusedDayId ? orderedDays.some((d) => d.dayId === focusedDayId) : false;
    if (!has) setFocusedDayId(orderedDays[0].dayId);
  }, [focusedDayId, orderedDays, selectedDayId]);

  const centerDay = useCallback((dayId: string, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const target = dayColumnRefs.current[dayId];
    if (!scroller || !target) return;
    const nextLeft = target.offsetLeft - (scroller.clientWidth - target.clientWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, nextLeft), behavior });
  }, []);

  useEffect(() => {
    if (viewMode !== 'multi' || !effectiveDayId) return;
    const frame = requestAnimationFrame(() => centerDay(effectiveDayId));
    return () => cancelAnimationFrame(frame);
  }, [centerDay, effectiveDayId, viewMode]);

  const activeDay = effectiveDayId
    ? orderedDays.find((d) => d.dayId === effectiveDayId) ?? null
    : null;

  const showPrev = viewMode === 'day' && !selectedDayId && effectiveDayIndex > 0;
  const showNext =
    viewMode === 'day' && !selectedDayId && effectiveDayIndex < orderedDays.length - 1;

  if (!orderedDays.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">
        Add a day to start planning
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerDownCapture={() => rootRef.current?.focus()}
      className="flex h-full min-h-0 flex-col overflow-hidden focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme bg-theme-elevated px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-theme-tertiary">
          <CalendarDays className="h-3.5 w-3.5" />
          Timeline
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === 'day' && (
            <div className="inline-flex overflow-hidden rounded-md border border-theme">
              <button
                type="button"
                onClick={() => {
                  if (!showPrev) return;
                  const prev = orderedDays[effectiveDayIndex - 1];
                  if (prev) setFocusedDayId(prev.dayId);
                }}
                disabled={!showPrev}
                className="flex h-7 w-7 items-center justify-center text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!showNext) return;
                  const next = orderedDays[effectiveDayIndex + 1];
                  if (next) setFocusedDayId(next.dayId);
                }}
                disabled={!showNext}
                className="flex h-7 w-7 items-center justify-center border-l border-theme text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="inline-flex rounded-md border border-theme bg-theme p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-theme-elevated text-theme shadow-theme-sm'
                  : 'text-theme-secondary hover:text-theme'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode('multi')}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === 'multi'
                  ? 'bg-theme-elevated text-theme shadow-theme-sm'
                  : 'text-theme-secondary hover:text-theme'
              }`}
            >
              Multi
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {viewMode === 'day' ? (
        <div className="min-h-0 flex-1 overflow-auto bg-theme p-2">
          {activeDay ? (
            <div
              className="mx-auto flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-theme bg-theme"
              style={{ minWidth: DAY_VIEW_MIN_W, maxWidth: DAY_VIEW_MAX_W }}
            >
              <div className="flex items-center justify-between border-b border-theme px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: activeDay.colorHex }}
                  />
                  <span className="truncate text-xs font-semibold text-theme">
                    {activeDay.label}
                  </span>
                </div>
                <span className="text-[11px] text-theme-tertiary">{activeDay.date}</span>
              </div>
              <div className="min-h-0 flex-1">
                <SingleDayTimeline
                  day={activeDay}
                  items={items}
                  selectedItemId={selectedItemId}
                  onUpdateItem={onUpdateItem}
                  onItemClick={(id) => {
                    onItemClick?.(id);
                    setFocusedDayId(activeDay.dayId);
                  }}
                  onItemDoubleClick={onItemDoubleClick}
                  onCreateAtTime={
                    onCreateAtTime
                      ? (s, e) => onCreateAtTime(activeDay.dayId, s, e)
                      : undefined
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-theme-tertiary">
              Select a day
            </div>
          )}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-auto bg-theme"
        >
          <div className="inline-flex min-h-full min-w-full">
            {/* Shared time axis – sticky left */}
            <div
              className="sticky left-0 z-20 flex-shrink-0 border-r border-theme-subtle bg-theme"
              style={{ width: TIME_AXIS_W }}
            >
              <div
                className="sticky top-0 z-30 border-b border-theme-subtle bg-theme"
                style={{ height: MULTI_HEADER_H }}
              />
              <div className="relative" style={{ height: gTotalH }}>
                {gHours.map((hr) => {
                  const y = (hr - globalRange.startH) * PX_PER_HR;
                  return (
                    <div
                      key={hr}
                      className="absolute flex items-center justify-end pr-2"
                      style={{ left: 0, width: TIME_AXIS_W, top: y - 7 }}
                    >
                      <span className="select-none text-[10px] font-medium tabular-nums text-theme-tertiary opacity-50">
                        {hourLabel(hr)}
                      </span>
                    </div>
                  );
                })}
                {gHours.slice(0, -1).flatMap((hr) =>
                  [1, 2, 3].map((q) => {
                    const y =
                      (hr - globalRange.startH) * PX_PER_HR + (q * PX_PER_HR) / 4;
                    return (
                      <div
                        key={`t-${hr}-${q}`}
                        className="absolute"
                        style={{
                          top: y,
                          right: 0,
                          width: q === 2 ? 8 : 4,
                          height: 1,
                          backgroundColor: 'rgb(var(--color-border) / 0.15)',
                        }}
                      />
                    );
                  }),
                )}
              </div>
            </div>

            {/* Day columns */}
            <div className="flex gap-2 px-2 py-2">
              {orderedDays.map((d) => {
                const dayItems = items
                  .filter((i) => i.dayId === d.dayId && i.scheduledStart)
                  .sort((a, b) => {
                    const t = toMins(a.scheduledStart) - toMins(b.scheduledStart);
                    return t === 0 ? a.sortOrder - b.sortOrder : t;
                  });

                return (
                  <MultiDayColumn
                    key={d.dayId}
                    ref={(node) => {
                      dayColumnRefs.current[d.dayId] = node;
                    }}
                    day={d}
                    dayItems={dayItems}
                    globalStartH={globalRange.startH}
                    globalEndH={globalRange.endH}
                    gTotalH={gTotalH}
                    gHours={gHours}
                    nowMin={nowMin}
                    selectedItemId={selectedItemId}
                    isActive={effectiveDayId === d.dayId}
                    scrollerRef={scrollerRef}
                    onUpdateItem={onUpdateItem}
                    onItemClick={(id) => {
                      onItemClick?.(id);
                      setFocusedDayId(d.dayId);
                    }}
                    onItemDoubleClick={onItemDoubleClick}
                    onCreateAtTime={onCreateAtTime}
                    onFocusDay={() => {
                      setFocusedDayId(d.dayId);
                      centerDay(d.dayId);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
