import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Clock, Timer, Tag, Star, ToggleLeft, ToggleRight, StickyNote } from 'lucide-react';
import type { Item, ItemType } from '../../types/trip';

function timeToMin(t: string): number {
  if (!t) return 0;
  const p = t.includes('T') ? t.split('T')[1] : t;
  const [h, m] = p.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minToTime(m: number): string {
  const c = Math.max(0, Math.min(1439, m));
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
}

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  onUpdate?: (updates: Partial<Item>) => void;
  onClose?: () => void;
}

const TYPE_OPTIONS: { value: ItemType; emoji: string; label: string }[] = [
  { value: 'attraction', emoji: '\u{1F3DB}\uFE0F', label: 'Attraction' },
  { value: 'restaurant', emoji: '\u{1F37D}\uFE0F', label: 'Restaurant' },
  { value: 'hotel', emoji: '\u{1F3E8}', label: 'Hotel' },
  { value: 'transport', emoji: '\u{1F68C}', label: 'Transport' },
  { value: 'activity', emoji: '\u{1F3AF}', label: 'Activity' },
  { value: 'other', emoji: '\u{1F4CD}', label: 'Other' },
];

export function ItemDetailCard({ item, dayColor = '#3B82F6', onUpdate, onClose }: ItemDetailCardProps) {
  const [start, setStart] = useState(item.scheduledStart);
  const [end, setEnd] = useState(item.scheduledEnd);
  const [duration, setDuration] = useState(item.durationMinutes);
  const [type, setType] = useState(item.type);
  const [priority, setPriority] = useState(item.priority);
  const [optional, setOptional] = useState(item.isOptional);
  const [notes, setNotes] = useState(item.notesMd);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Sync from props when item changes externally
  useEffect(() => {
    setStart(item.scheduledStart);
    setEnd(item.scheduledEnd);
    setDuration(item.durationMinutes);
    setType(item.type);
    setPriority(item.priority);
    setOptional(item.isOptional);
    setNotes(item.notesMd);
  }, [item.itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const durH = Math.floor(duration / 60);
  const durM = duration % 60;

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  const changeStart = useCallback(
    (newStart: string) => {
      setStart(newStart);
      // Recalculate end from start + duration
      const newEnd = minToTime(timeToMin(newStart) + duration);
      setEnd(newEnd);
      commit({ scheduledStart: newStart, scheduledEnd: newEnd });
    },
    [duration, commit],
  );

  const changeEnd = useCallback(
    (newEnd: string) => {
      setEnd(newEnd);
      // Recalculate duration from start → end
      const newDur = Math.max(0, timeToMin(newEnd) - timeToMin(start));
      setDuration(newDur);
      commit({ scheduledEnd: newEnd, durationMinutes: newDur });
    },
    [start, commit],
  );

  const changeDuration = useCallback(
    (newDur: number) => {
      setDuration(newDur);
      // Recalculate end from start + new duration
      if (start) {
        const newEnd = minToTime(timeToMin(start) + newDur);
        setEnd(newEnd);
        commit({ durationMinutes: newDur, scheduledEnd: newEnd });
      } else {
        commit({ durationMinutes: newDur });
      }
    },
    [start, commit],
  );

  const currentType = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[5];

  // Auto-resize notes textarea
  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(56, el.scrollHeight)}px`;
  }, [notes]);

  return (
    <div className="animate-in rounded-xl border border-theme bg-theme-elevated shadow-theme-md overflow-hidden">
      {/* Color accent strip */}
      <div className="h-1" style={{ backgroundColor: dayColor }} />

      {/* Header */}
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-2">
        <span className="mt-0.5 text-sm leading-none">{currentType.emoji}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug text-theme">
            {item.placeName}
          </h4>
          {item.address && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-theme-tertiary">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{item.address}</span>
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-theme-tertiary transition-colors hover:bg-theme-subtle hover:text-theme-secondary"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-theme-subtle" style={{ backgroundColor: `${dayColor}18` }} />

      {/* Fields */}
      <div className="space-y-2 px-3 py-2.5">
        {/* Type row */}
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 flex-shrink-0 text-theme-tertiary" />
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value as ItemType;
              setType(v);
              commit({ type: v });
            }}
            className="input w-full py-1 text-xs"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time row */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 flex-shrink-0 text-theme-tertiary" />
          <input
            type="time"
            value={start}
            onChange={(e) => changeStart(e.target.value)}
            className="input w-full py-1 text-xs"
          />
          <span className="text-[10px] text-theme-tertiary">&ndash;</span>
          <input
            type="time"
            value={end}
            onChange={(e) => changeEnd(e.target.value)}
            className="input w-full py-1 text-xs"
          />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 flex-shrink-0 text-theme-tertiary" />
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              min={0}
              max={23}
              value={durH}
              onChange={(e) => {
                const h = Math.max(0, Math.min(23, Number(e.target.value)));
                changeDuration(h * 60 + durM);
              }}
              className="input w-10 py-1 text-center text-xs"
            />
            <span className="text-[10px] text-theme-tertiary">h</span>
            <input
              type="number"
              min={0}
              max={59}
              step={5}
              value={durM}
              onChange={(e) => {
                const m = Math.max(0, Math.min(59, Number(e.target.value)));
                changeDuration(durH * 60 + m);
              }}
              className="input w-10 py-1 text-center text-xs"
            />
            <span className="text-[10px] text-theme-tertiary">m</span>
          </div>
        </div>

        {/* Priority + Optional */}
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 flex-shrink-0 text-theme-tertiary" />
          <div className="flex flex-1 items-center gap-px">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  const next = priority === v ? 0 : v;
                  setPriority(next);
                  commit({ priority: next });
                }}
                className="rounded p-0.5 transition-colors hover:scale-110"
                aria-label={`Priority ${v}`}
              >
                <Star
                  className="h-3.5 w-3.5 transition-colors"
                  fill={v <= priority ? '#f59e0b' : 'none'}
                  stroke={v <= priority ? '#f59e0b' : 'rgb(var(--color-text-tertiary))'}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const v = !optional;
              setOptional(v);
              commit({ isOptional: v });
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-theme-subtle"
            style={{ color: optional ? dayColor : undefined }}
          >
            {optional ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-theme-tertiary" />
            )}
            <span className={optional ? 'font-medium' : 'text-theme-tertiary'}>
              Optional
            </span>
          </button>
        </div>

        {/* Notes */}
        <div className="flex items-start gap-1.5">
          <StickyNote className="mt-1.5 h-3.5 w-3.5 flex-shrink-0 text-theme-tertiary" />
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== item.notesMd) {
                commit({ notesMd: notes });
              }
            }}
            placeholder="Notes (markdown)"
            rows={2}
            className="input w-full resize-none py-1.5 text-xs leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
