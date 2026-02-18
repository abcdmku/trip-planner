import { useEffect, useMemo, useState } from 'react';
import { X, Plus, MapPin, Navigation } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import type { PlaceSearchResult } from '../../services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '../../types/trip';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';
import { EventEditorForm, type EventEditorValue } from './EventEditorForm';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: {
    placeId: string;
    placeName: string;
    lat: number;
    lng: number;
    address: string;
    type: ItemType;
    durationMinutes: number;
    notesMd: string;
    scheduledStart: string;
    scheduledEnd: string;
    destLat: number;
    destLng: number;
    destName: string;
    destAddress: string;
    transportMode: TransportMode;
    itemRouteType: RouteType;
    availabilityWindows: string;
    timelineLocked: boolean;
    travelFromItemId?: string;
    travelToItemId?: string;
  }) => void;
  isSubmitting?: boolean;
  initialPlace?: PlaceSearchResult | null;
  initialDestination?: PlaceSearchResult | null;
  initialLocation?: { lat: number; lng: number } | null;
  initialStartTime?: string;
  initialEndTime?: string;
  initialType?: ItemType;
  initialTransportMode?: TransportMode;
  initialRouteType?: RouteType;
  initialAvailabilityWindows?: string;
  initialTimelineLocked?: boolean;
  initialTravelFromItemId?: string;
  initialTravelToItemId?: string;
}

function inferItemType(googleTypes: string[]): ItemType {
  const s = new Set(googleTypes);
  if (s.has('lodging') || s.has('hotel') || s.has('motel') || s.has('resort_hotel')) return 'hotel';
  if (s.has('restaurant') || s.has('food') || s.has('cafe') || s.has('bar')) return 'restaurant';
  if (s.has('airport') || s.has('train_station') || s.has('transit_station') || s.has('bus_station')) return 'transport';
  if (s.has('museum') || s.has('art_gallery') || s.has('tourist_attraction') || s.has('park')) return 'attraction';
  if (s.has('gym') || s.has('spa') || s.has('stadium') || s.has('amusement_park')) return 'activity';
  return 'other';
}

function routeTypeForMode(mode: TransportMode): RouteType {
  return mode === 'flight' || mode === 'other' ? 'straight' : 'directions';
}

function draftFromProps(
  initialType: ItemType | undefined,
  initialTransportMode: TransportMode | undefined,
  initialRouteType: RouteType | undefined,
  initialStartTime: string | undefined,
  initialEndTime: string | undefined,
  initialAvailabilityWindows: string | undefined,
  initialTimelineLocked: boolean | undefined,
): EventEditorValue {
  const mode = initialTransportMode ?? 'driving';
  const routeType = initialRouteType ?? routeTypeForMode(mode);
  let duration = 60;
  if (initialStartTime && initialEndTime) {
    const [sh, sm] = initialStartTime.split(':').map(Number);
    const [eh, em] = initialEndTime.split(':').map(Number);
    const nextDuration = eh * 60 + em - (sh * 60 + sm);
    if (nextDuration > 0) duration = nextDuration;
  }
  return {
    type: initialType ?? 'attraction',
    transportMode: mode,
    itemRouteType: routeType,
    scheduledStart: initialStartTime ?? '',
    scheduledEnd: initialEndTime ?? '',
    durationMinutes: duration,
    notesMd: '',
    availabilityWindows: initialAvailabilityWindows ?? '[]',
    timelineLocked: initialTimelineLocked ?? false,
  };
}

export function AddItemDialog({
  isOpen,
  onClose,
  onAdd,
  isSubmitting,
  initialPlace,
  initialDestination,
  initialLocation,
  initialStartTime,
  initialEndTime,
  initialType,
  initialTransportMode,
  initialRouteType,
  initialAvailabilityWindows,
  initialTimelineLocked,
  initialTravelFromItemId,
  initialTravelToItemId,
}: AddItemDialogProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [destPlace, setDestPlace] = useState<PlaceSearchResult | null>(null);
  const [customName, setCustomName] = useState('');
  const [editor, setEditor] = useState<EventEditorValue>(() =>
    draftFromProps(
      initialType,
      initialTransportMode,
      initialRouteType,
      initialStartTime,
      initialEndTime,
      initialAvailabilityWindows,
      initialTimelineLocked,
    ),
  );

  const initialDraft = useMemo(
    () =>
      draftFromProps(
        initialType,
        initialTransportMode,
        initialRouteType,
        initialStartTime,
        initialEndTime,
        initialAvailabilityWindows,
        initialTimelineLocked,
      ),
    [
      initialType,
      initialTransportMode,
      initialRouteType,
      initialStartTime,
      initialEndTime,
      initialAvailabilityWindows,
      initialTimelineLocked,
    ],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (initialPlace) {
      setSelectedPlace(initialPlace);
      setCustomName('');
      if (!initialType && initialPlace.types.length > 0) {
        setEditor((prev) => ({
          ...prev,
          type: inferItemType(initialPlace.types),
        }));
      } else {
        setEditor(initialDraft);
      }
    } else if (initialLocation) {
      setSelectedPlace({
        placeId: `custom-${Date.now()}`,
        name: '',
        address: `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`,
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        types: [],
      });
      setCustomName('');
      setEditor(initialDraft);
    } else {
      setSelectedPlace(null);
      setCustomName('');
      setEditor(initialDraft);
    }

    setDestPlace(initialDestination ?? null);
  }, [isOpen, initialPlace, initialDestination, initialLocation, initialType, initialDraft]);

  useEscapeHotkey(isOpen, onClose);

  if (!isOpen) return null;

  const isCustomLocation = selectedPlace?.placeId.startsWith('custom-');
  const isOriginValid = Boolean(selectedPlace) && (!isCustomLocation || Boolean(customName.trim()));

  const handleSubmit = () => {
    if (!selectedPlace) return;
    const placeName = isCustomLocation ? customName.trim() : selectedPlace.name;
    if (!placeName) return;
    onAdd({
      placeId: selectedPlace.placeId,
      placeName,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      address: selectedPlace.address,
      type: editor.type,
      durationMinutes: editor.durationMinutes,
      notesMd: editor.notesMd,
      scheduledStart: editor.scheduledStart,
      scheduledEnd: editor.scheduledEnd,
      destLat: destPlace?.lat ?? 0,
      destLng: destPlace?.lng ?? 0,
      destName: destPlace?.name ?? '',
      destAddress: destPlace?.address ?? '',
      transportMode: editor.transportMode,
      itemRouteType: editor.itemRouteType,
      availabilityWindows: editor.availabilityWindows,
      timelineLocked: editor.timelineLocked,
      travelFromItemId: initialTravelFromItemId ?? '',
      travelToItemId: initialTravelToItemId ?? '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-theme">Add Event to Itinerary</h2>
        </div>

        <div className="mb-3 rounded-xl border border-theme bg-theme p-3">
          <div className="flex gap-2.5">
            <div className="flex flex-col items-center pt-2">
              <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              <div className="w-px flex-1 min-h-[12px] bg-accent/30" />
              <Navigation className="h-3 w-3 text-accent/70" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-theme-tertiary">Origin</label>
                {isCustomLocation ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">Map location ({selectedPlace?.address})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlace(null);
                          setCustomName('');
                        }}
                        className="ml-auto text-blue-500 hover:text-blue-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Name this location"
                      className="input w-full py-1 text-xs"
                    />
                  </div>
                ) : selectedPlace ? (
                  <div className="flex items-center gap-2 rounded-md bg-accent/10 px-2 py-1 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-accent">{selectedPlace.name}</p>
                      {selectedPlace.address ? (
                        <p className="truncate text-[10px] text-accent/70">{selectedPlace.address}</p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setSelectedPlace(null)} className="text-accent/70 hover:text-accent">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <PlaceSearch
                    onSelect={(place) => {
                      setSelectedPlace(place);
                      if (!initialType && place.types.length > 0) {
                        setEditor((prev) => ({ ...prev, type: inferItemType(place.types) }));
                      }
                    }}
                    placeholder="Search origin..."
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-theme-tertiary">
                  Destination (optional)
                </label>
                {destPlace ? (
                  <div className="flex items-center gap-2 rounded-md bg-accent/10 px-2 py-1 text-xs">
                    <Navigation className="h-3.5 w-3.5 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-accent">{destPlace.name}</p>
                      {destPlace.address ? (
                        <p className="truncate text-[10px] text-accent/70">{destPlace.address}</p>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setDestPlace(null)} className="text-accent/70 hover:text-accent">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <PlaceSearch onSelect={setDestPlace} placeholder="Search destination..." />
                )}
              </div>
            </div>
          </div>
        </div>

        <EventEditorForm
          value={editor}
          onChange={setEditor}
          onSubmit={handleSubmit}
          submitLabel="Add Event to Itinerary"
          isSubmitting={isSubmitting}
          submitDisabled={!isOriginValid}
        />
      </div>
    </div>
  );
}
