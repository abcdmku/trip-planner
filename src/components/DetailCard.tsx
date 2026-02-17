import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ItineraryItem, ItemType, TransportMode, TripDay } from '../types/domain';

const ITEM_TYPES: ItemType[] = ['route', 'poi', 'activity', 'lodging', 'food', 'transit'];
const TRANSPORT_MODES: TransportMode[] = ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'];

interface DetailCardProps {
  item?: ItineraryItem;
  day?: TripDay;
  tripTimezone?: string;
  onUpdate: (itemId: string, patch: Partial<ItineraryItem>) => void;
}

export function DetailCard({ item, day, tripTimezone, onUpdate }: DetailCardProps) {
  const [preview, setPreview] = useState(false);

  const photoText = useMemo(() => (item ? item.photoUrls.join('\n') : ''), [item]);

  if (!item || !day) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Detail Editor</p>
        <p className="mt-3 text-sm text-slate-400">Select a timeline block or itinerary item to edit details.</p>
      </section>
    );
  }

  const timezoneChanged = item.localTimezone && tripTimezone && item.localTimezone !== tripTimezone;

  return (
    <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Detail Editor</p>
        {timezoneChanged ? (
          <span className="rounded bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-200">
            Timezone change: {tripTimezone} {"->"} {item.localTimezone}
          </span>
        ) : null}
      </div>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Title</span>
        <input
          value={item.title}
          onChange={(event) => onUpdate(item.itemId, { title: event.target.value })}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Type</span>
          <select
            value={item.type}
            onChange={(event) => onUpdate(item.itemId, { type: event.target.value as ItemType })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Mode</span>
          <select
            value={item.mode}
            onChange={(event) => onUpdate(item.itemId, { mode: event.target.value as TransportMode })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          >
            {TRANSPORT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Priority (0-100)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={item.priority}
            onChange={(event) => onUpdate(item.itemId, { priority: Number(event.target.value) || 0 })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Start</span>
          <input
            type="time"
            value={item.startTime}
            onChange={(event) => onUpdate(item.itemId, { startTime: event.target.value })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">End</span>
          <input
            type="time"
            value={item.endTime}
            onChange={(event) => onUpdate(item.itemId, { endTime: event.target.value })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Availability Start</span>
          <input
            type="time"
            value={item.availabilityStart ?? ''}
            onChange={(event) =>
              onUpdate(item.itemId, { availabilityStart: event.target.value || undefined })
            }
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Availability End</span>
          <input
            type="time"
            value={item.availabilityEnd ?? ''}
            onChange={(event) => onUpdate(item.itemId, { availabilityEnd: event.target.value || undefined })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Tags (comma-separated)</span>
          <input
            value={item.tags.join(', ')}
            onChange={(event) =>
              onUpdate(item.itemId, {
                tags: event.target.value
                  .split(',')
                  .map((entry) => entry.trim())
                  .filter(Boolean)
              })
            }
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs">
          <input
            type="checkbox"
            checked={item.isOptional}
            onChange={(event) => onUpdate(item.itemId, { isOptional: event.target.checked })}
          />
          Optional stop
        </label>
      </div>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Photo URLs (one per line)</span>
        <textarea
          rows={3}
          value={photoText}
          onChange={(event) =>
            onUpdate(item.itemId, {
              photoUrls: event.target.value
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean)
            })
          }
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
        />
      </label>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Notes (Markdown)</p>
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            className="rounded border border-slate-600 px-2 py-1 text-[10px]"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {preview ? (
          <div className="prose prose-invert max-w-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm">
            <ReactMarkdown>{item.notesMd || '_No notes yet._'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            rows={6}
            value={item.notesMd}
            onChange={(event) => onUpdate(item.itemId, { notesMd: event.target.value })}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm"
          />
        )}
      </div>
    </section>
  );
}
