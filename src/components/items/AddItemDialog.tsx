import { useState, useEffect } from 'react';
import { X, Plus, Loader2, MapPin } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import type { PlaceSearchResult } from '../../services/maps-repository';
import type { ItemType } from '../../types/trip';
import { useEscapeHotkey } from '../../hooks/useEscapeHotkey';

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
  }) => void;
  isSubmitting?: boolean;
  /** Optional initial place from map POI click */
  initialPlace?: PlaceSearchResult | null;
  /** Optional initial location from map click */
  initialLocation?: { lat: number; lng: number } | null;
  /** Optional initial start time (HH:mm) from timeline click/drag */
  initialStartTime?: string;
  /** Optional initial end time (HH:mm) from timeline click/drag */
  initialEndTime?: string;
}

const ITEM_TYPES: { value: ItemType; label: string; emoji: string }[] = [
  { value: 'attraction', label: 'Attraction', emoji: '🏛️' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'transport', label: 'Transport', emoji: '🚌' },
  { value: 'activity', label: 'Activity', emoji: '🎯' },
  { value: 'other', label: 'Other', emoji: '📍' },
];

/** Map Google Maps place types to our ItemType categories. */
function inferItemType(googleTypes: string[]): ItemType {
  const s = new Set(googleTypes);
  // Hotels / lodging
  if (s.has('lodging') || s.has('hotel') || s.has('motel') || s.has('resort_hotel') || s.has('extended_stay_hotel')) return 'hotel';
  // Restaurants / food
  if (s.has('restaurant') || s.has('food') || s.has('cafe') || s.has('bakery') || s.has('bar') || s.has('meal_delivery') || s.has('meal_takeaway')) return 'restaurant';
  // Transport
  if (s.has('airport') || s.has('train_station') || s.has('transit_station') || s.has('bus_station') || s.has('subway_station') || s.has('taxi_stand') || s.has('ferry_terminal')) return 'transport';
  // Activities
  if (s.has('amusement_park') || s.has('aquarium') || s.has('bowling_alley') || s.has('gym') || s.has('spa') || s.has('stadium') || s.has('zoo') || s.has('night_club') || s.has('movie_theater') || s.has('campground')) return 'activity';
  // Attractions / culture
  if (s.has('museum') || s.has('art_gallery') || s.has('church') || s.has('hindu_temple') || s.has('mosque') || s.has('synagogue') || s.has('tourist_attraction') || s.has('park') || s.has('point_of_interest') || s.has('place_of_worship') || s.has('landmark') || s.has('natural_feature')) return 'attraction';
  return 'other';
}

export function AddItemDialog({ isOpen, onClose, onAdd, isSubmitting, initialPlace, initialLocation, initialStartTime, initialEndTime }: AddItemDialogProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [type, setType] = useState<ItemType>('attraction');
  const [duration, setDuration] = useState(60);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');

  // Preload either a map-selected place or raw clicked coordinates.
  useEffect(() => {
    if (!isOpen) return;

    if (initialPlace) {
      setSelectedPlace(initialPlace);
      setCustomName('');
      if (initialPlace.types.length > 0) {
        setType(inferItemType(initialPlace.types));
      }
      return;
    }

    if (initialLocation) {
      setSelectedPlace({
        placeId: `custom-${Date.now()}`,
        name: '',
        address: `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}`,
        lat: initialLocation.lat,
        lng: initialLocation.lng,
        types: [],
      });
      setCustomName('');
    }
  }, [initialPlace, initialLocation, isOpen]);

  // Pre-fill times from timeline click/drag
  useEffect(() => {
    if (!isOpen) return;
    if (initialStartTime) {
      setScheduledStart(initialStartTime);
      if (initialEndTime) {
        setScheduledEnd(initialEndTime);
        const [sh, sm] = initialStartTime.split(':').map(Number);
        const [eh, em] = initialEndTime.split(':').map(Number);
        const dur = (eh * 60 + em) - (sh * 60 + sm);
        if (dur > 0) setDuration(dur);
      }
    }
  }, [isOpen, initialStartTime, initialEndTime]);

  useEscapeHotkey(isOpen, onClose);

  if (!isOpen) return null;

  const isCustomLocation = selectedPlace?.placeId.startsWith('custom-');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace) return;
    // For custom locations (from map click), use the custom name
    const placeName = isCustomLocation ? customName : selectedPlace.name;
    if (!placeName.trim()) return;
    onAdd({
      placeId: selectedPlace.placeId,
      placeName,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      address: selectedPlace.address,
      type,
      durationMinutes: duration,
      notesMd: notes,
      scheduledStart,
      scheduledEnd,
    });
    // Reset
    setSelectedPlace(null);
    setCustomName('');
    setType('attraction');
    setDuration(60);
    setNotes('');
    setScheduledStart('');
    setScheduledEnd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-theme bg-theme-elevated p-6 shadow-theme-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-theme">Add Stop</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-theme-secondary">Place</label>
            {isCustomLocation ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400">Location from map</span>
                  <span className="text-xs text-blue-500/70">{selectedPlace?.address}</span>
                  <button type="button" onClick={() => { setSelectedPlace(null); setCustomName(''); }} className="ml-auto text-blue-400 hover:text-blue-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter a name for this location..."
                  className="input"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <PlaceSearch onSelect={(place) => {
                  setSelectedPlace(place);
                  if (place.types.length > 0) {
                    setType(inferItemType(place.types));
                  }
                }} />
                {selectedPlace && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm">
                    <span className="font-medium text-accent">{selectedPlace.name}</span>
                    <button type="button" onClick={() => setSelectedPlace(null)} className="ml-auto text-accent/60 hover:text-accent">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-theme-secondary">Type</label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    type === t.value
                      ? 'bg-accent/20 text-accent ring-1 ring-accent/50'
                      : 'bg-theme-subtle text-theme-secondary hover:bg-theme-subtle/80 hover:text-theme'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-start" className="mb-1 block text-sm font-medium text-theme-secondary">Start Time</label>
              <input id="add-start" type="time" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="add-end" className="mb-1 block text-sm font-medium text-theme-secondary">End Time</label>
              <input id="add-end" type="time" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label htmlFor="add-duration" className="mb-1 block text-sm font-medium text-theme-secondary">Duration (minutes)</label>
            <input id="add-duration" type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
          </div>

          <div>
            <label htmlFor="add-notes" className="mb-1 block text-sm font-medium text-theme-secondary">Notes (Markdown)</label>
            <textarea id="add-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tips, booking info, links..." className="input resize-none" />
          </div>

          <button
            type="submit"
            disabled={!selectedPlace || isSubmitting || (isCustomLocation && !customName.trim())}
            className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to Itinerary
          </button>
        </form>
      </div>
    </div>
  );
}
