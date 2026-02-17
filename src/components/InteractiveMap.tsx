import { useEffect, useMemo, useRef } from 'react';
import { ITEM_TYPE_ICONS } from '../constants/colors';
import type { ItineraryItem, TravelLeg, TripDay } from '../types/domain';

interface InteractiveMapProps {
  enabled: boolean;
  days: TripDay[];
  selectedDayIds: string[];
  items: ItineraryItem[];
  legs: TravelLeg[];
  selectedItemId?: string;
  onSelectItem: (itemId: string) => void;
}

export function InteractiveMap({
  enabled,
  days,
  selectedDayIds,
  items,
  legs,
  selectedItemId,
  onSelectItem
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<{ markers: google.maps.Marker[]; polylines: google.maps.Polyline[] }>({
    markers: [],
    polylines: []
  });

  const dayColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const day of days) {
      map.set(day.dayId, day.colorHex);
    }
    return map;
  }, [days]);

  const visibleItems = useMemo(
    () => items.filter((item) => selectedDayIds.includes(item.dayId)),
    [items, selectedDayIds]
  );

  const visibleLegs = useMemo(
    () => legs.filter((leg) => selectedDayIds.includes(leg.dayId)),
    [legs, selectedDayIds]
  );

  useEffect(() => {
    if (!enabled || !mapContainerRef.current || !window.google) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 37.773972, lng: -122.431297 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !mapRef.current || !window.google) {
      return;
    }

    for (const marker of overlaysRef.current.markers) {
      marker.setMap(null);
    }

    for (const polyline of overlaysRef.current.polylines) {
      polyline.setMap(null);
    }

    overlaysRef.current.markers = [];
    overlaysRef.current.polylines = [];

    const map = mapRef.current;
    const bounds = new google.maps.LatLngBounds();

    for (const leg of visibleLegs) {
      if (!leg.routePathEncoded) {
        continue;
      }

      const path = google.maps.geometry.encoding.decodePath(leg.routePathEncoded);
      if (path.length === 0) {
        continue;
      }

      const color = dayColorMap.get(leg.dayId) ?? '#38bdf8';

      const polyline = new google.maps.Polyline({
        path,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map
      });

      overlaysRef.current.polylines.push(polyline);

      for (const point of path) {
        bounds.extend(point);
      }
    }

    for (const item of visibleItems) {
      const color = dayColorMap.get(item.dayId) ?? '#38bdf8';
      const marker = new google.maps.Marker({
        map,
        position: { lat: item.lat, lng: item.lng },
        title: item.title,
        label: {
          text: ITEM_TYPE_ICONS[item.type] ?? '•',
          color: '#0f172a',
          fontSize: '11px',
          fontWeight: '700'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: selectedItemId === item.itemId ? '#f8fafc' : '#0f172a',
          strokeWeight: selectedItemId === item.itemId ? 3 : 1,
          scale: selectedItemId === item.itemId ? 10 : 8
        }
      });

      marker.addListener('click', () => onSelectItem(item.itemId));
      overlaysRef.current.markers.push(marker);
      bounds.extend({ lat: item.lat, lng: item.lng });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
    }
  }, [dayColorMap, enabled, onSelectItem, selectedItemId, visibleItems, visibleLegs]);

  if (!enabled) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-sm text-slate-400">
        Configure `VITE_GOOGLE_MAPS_API_KEY` to render the interactive street-path map.
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-[420px] w-full rounded-xl border border-slate-700" />;
}
