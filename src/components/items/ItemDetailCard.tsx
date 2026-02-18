import { useCallback, useEffect, useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import type { Item } from '../../types/trip';
import { PlaceSearch } from './PlaceSearch';
import type { PlaceSearchResult } from '../../services/maps-repository';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  dayDate?: string;
  onUpdate?: (updates: Partial<Item>) => void;
  onClose?: () => void;
}

function itemToEditorValue(item: Item): EventEditorValue {
  return {
    type: item.type,
    transportMode: item.transportMode,
    itemRouteType: item.itemRouteType,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    durationMinutes: item.durationMinutes,
    notesMd: item.notesMd,
    availabilityWindows: item.availabilityWindows,
    timelineLocked: item.timelineLocked,
  };
}

export function ItemDetailCard({
  item,
  dayColor = '#3B82F6',
  dayDate,
  onUpdate,
  onClose,
}: ItemDetailCardProps) {
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [showDestSearch, setShowDestSearch] = useState(false);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;

  useEffect(() => {
    setEditorValue(itemToEditorValue(item));
    setShowDestSearch(false);
  }, [item]);

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  const handleEditorChange = (next: EventEditorValue) => {
    setEditorValue(next);
    commit({
      type: next.type,
      transportMode: next.transportMode,
      itemRouteType: next.itemRouteType,
      scheduledStart: next.scheduledStart,
      scheduledEnd: next.scheduledEnd,
      durationMinutes: next.durationMinutes,
      notesMd: next.notesMd,
      availabilityWindows: next.availabilityWindows,
      timelineLocked: next.timelineLocked,
      // Refresh cached route whenever mode/type changes from inline editor.
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
    });
  };

  const handleDestSelect = (place: PlaceSearchResult) => {
    commit({
      destLat: place.lat,
      destLng: place.lng,
      destName: place.name,
      destAddress: place.address,
      itemRoutePathEncoded: '',
      itemRouteDistanceMeters: 0,
      itemRouteDurationMinutes: 0,
    });
    setShowDestSearch(false);
  };

  return (
    <div className="animate-in overflow-hidden rounded-xl border border-theme bg-theme-elevated shadow-theme-md">
      <div className="h-1" style={{ backgroundColor: dayColor }} />

      <div className="px-3 py-2">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center pt-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dayColor }} />
            {(hasDest || showDestSearch) ? (
              <>
                <div className="w-px min-h-[12px] flex-1" style={{ backgroundColor: `${dayColor}40` }} />
                <Navigation className="h-3 w-3" style={{ color: dayColor }} />
              </>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-theme">{item.placeName}</h4>
            {item.address ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-theme-tertiary">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            ) : null}

            {hasDest ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-theme-subtle px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-theme">{item.destName}</p>
                  {item.destAddress ? (
                    <p className="truncate text-[10px] text-theme-tertiary">{item.destAddress}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    commit({
                      destLat: 0,
                      destLng: 0,
                      destName: '',
                      destAddress: '',
                      itemRoutePathEncoded: '',
                      itemRouteDistanceMeters: 0,
                      itemRouteDurationMinutes: 0,
                    })
                  }
                  className="rounded p-0.5 text-theme-tertiary hover:text-theme"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : showDestSearch ? (
              <div className="mt-2 space-y-1">
                <PlaceSearch onSelect={handleDestSelect} placeholder="Search destination..." />
                <button
                  type="button"
                  onClick={() => setShowDestSearch(false)}
                  className="text-[10px] text-theme-tertiary hover:text-theme"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDestSearch(true)}
                className="mt-1 text-[10px] text-theme-tertiary hover:text-theme"
              >
                + Add destination
              </button>
            )}
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-3 pb-3">
        <EventEditorForm
          value={editorValue}
          onChange={handleEditorChange}
          compact
          defaultDate={dayDate}
        />
      </div>
    </div>
  );
}
