import { useMemo, useState } from 'react';
import { ITEM_TYPE_ICONS } from '../constants/colors';
import type { ItineraryItem, PlaceSearchResult, TripDay } from '../types/domain';

interface ItineraryPanelProps {
  days: TripDay[];
  items: ItineraryItem[];
  selectedDayIds: string[];
  selectedItemId?: string;
  onSelectItem: (itemId: string) => void;
  onSearchPlaces: (query: string) => Promise<PlaceSearchResult[]>;
  onAddPlaceToDay: (dayId: string, place: PlaceSearchResult) => void;
  onAddManualItem: (dayId: string) => void;
  onImportSavedPlaces: (dayId: string, lines: string[]) => Promise<void>;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  onDeleteItem: (itemId: string) => void;
}

export function ItineraryPanel({
  days,
  items,
  selectedDayIds,
  selectedItemId,
  onSelectItem,
  onSearchPlaces,
  onAddPlaceToDay,
  onAddManualItem,
  onImportSavedPlaces,
  onMoveItem,
  onDeleteItem
}: ItineraryPanelProps) {
  const [activeDayId, setActiveDayId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [pastePayload, setPastePayload] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);

  const effectiveDayId =
    activeDayId || selectedDayIds[0] || days[0]?.dayId || '';

  const visibleDayItems = useMemo(() => {
    const byDay = new Map<string, ItineraryItem[]>();

    for (const day of days) {
      byDay.set(day.dayId, []);
    }

    for (const item of items) {
      if (!byDay.has(item.dayId)) {
        byDay.set(item.dayId, []);
      }

      byDay.get(item.dayId)?.push(item);
    }

    for (const [dayId, list] of byDay.entries()) {
      byDay.set(
        dayId,
        [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId))
      );
    }

    return byDay;
  }, [days, items]);

  const handleSearch = async (): Promise<void> => {
    setLoadingSearch(true);
    try {
      const results = await onSearchPlaces(searchTerm);
      setSearchResults(results);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handlePasteImport = async (): Promise<void> => {
    const lines = pastePayload
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0 || !effectiveDayId) {
      return;
    }

    await onImportSavedPlaces(effectiveDayId, lines);
    setPastePayload('');
  };

  return (
    <section className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Itinerary Builder</p>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Target Day</span>
        <select
          value={effectiveDayId}
          onChange={(event) => setActiveDayId(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
        >
          {days.map((day) => (
            <option key={day.dayId} value={day.dayId}>
              {day.label} ({day.date})
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
          placeholder="Search Google Maps places"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950"
          >
            {loadingSearch ? 'Searching...' : 'Search Place'}
          </button>
          <button
            type="button"
            onClick={() => onAddManualItem(effectiveDayId)}
            className="rounded-lg border border-slate-500 px-3 py-2 text-xs font-semibold text-slate-100"
          >
            Add Manual Item
          </button>
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-slate-700 p-2">
          {searchResults.map((result) => (
            <div key={`${result.title}-${result.lat}-${result.lng}`} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">{result.title}</p>
                <p className="text-xs text-slate-400">
                  {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddPlaceToDay(effectiveDayId, result)}
                className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 rounded-md border border-slate-700 p-2">
        <p className="text-xs text-slate-300">Paste Google Maps place URLs (one per line, optional name before URL).</p>
        <textarea
          value={pastePayload}
          onChange={(event) => setPastePayload(event.target.value)}
          rows={3}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-100"
        />
        <button
          type="button"
          onClick={handlePasteImport}
          className="rounded-lg border border-slate-500 px-3 py-2 text-xs font-semibold text-slate-100"
        >
          Import Saved Places
        </button>
      </div>

      <div className="space-y-3 border-t border-slate-700 pt-3">
        {days
          .filter((day) => selectedDayIds.includes(day.dayId))
          .map((day) => {
            const dayItems = visibleDayItems.get(day.dayId) ?? [];
            return (
              <div key={day.dayId} className="rounded-md border border-slate-700 p-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  {day.label}
                </p>
                <div className="space-y-2">
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-slate-500">No items yet.</p>
                  ) : (
                    dayItems.map((item, index) => {
                      const selected = item.itemId === selectedItemId;
                      return (
                        <div
                          key={item.itemId}
                          className={`rounded-md border p-2 ${selected ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700'}`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectItem(item.itemId)}
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span className="text-xs font-semibold text-slate-100">
                              {ITEM_TYPE_ICONS[item.type]} {item.title}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.startTime} - {item.endTime}
                            </span>
                          </button>
                          <div className="mt-2 flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => onMoveItem(item.itemId, 'up')}
                              className="rounded border border-slate-600 px-2 py-1 text-[10px] disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              disabled={index === dayItems.length - 1}
                              onClick={() => onMoveItem(item.itemId, 'down')}
                              className="rounded border border-slate-600 px-2 py-1 text-[10px] disabled:opacity-40"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.itemId)}
                              className="rounded border border-rose-500/40 px-2 py-1 text-[10px] text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
