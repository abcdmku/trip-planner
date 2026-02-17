import { InfoWindow } from '@vis.gl/react-google-maps';
import { Globe, Loader2, MapPin, Phone, Plus, Star } from 'lucide-react';
import type { PlaceSearchResult } from '@/services/maps-repository';

interface MapPlaceInfoWindowProps {
  position: { lat: number; lng: number };
  place: PlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
  onAddToItinerary: (place: PlaceSearchResult) => void;
  onClose: () => void;
}

function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPriceLevel(level?: number): string | null {
  if (!level || level < 1) return null;
  return '$'.repeat(level);
}

export default function MapPlaceInfoWindow({
  position,
  place,
  isLoading,
  error,
  onAddToItinerary,
  onClose,
}: MapPlaceInfoWindowProps) {
  const photo = place?.photoUrls?.[0] ?? place?.photoRef;
  const price = formatPriceLevel(place?.priceLevel);

  return (
    <InfoWindow position={position} onCloseClick={onClose} pixelOffset={[0, -35]}>
      <div className="max-h-[440px] min-w-[260px] max-w-[360px] overflow-y-auto rounded-xl border border-theme bg-theme-elevated p-2 text-theme shadow-theme-sm">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-theme-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading place details...</span>
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!isLoading && !error && place && (
          <>
            {photo && (
              <img
                src={photo}
                alt={place.name || 'Place photo'}
                className="mb-2 h-36 w-full rounded-lg object-cover"
                loading="lazy"
              />
            )}

            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-theme">
                  {place.name || 'Unnamed place'}
                </h3>
                {place.address && (
                  <p className="mt-0.5 text-xs text-theme-secondary">{place.address}</p>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {place.rating !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <Star className="h-3 w-3" />
                  {place.rating.toFixed(1)}
                  {place.userRatingsTotal ? ` (${place.userRatingsTotal})` : ''}
                </span>
              )}

              {price && (
                <span className="rounded-full border border-theme bg-theme-subtle px-2 py-0.5 text-[10px] font-medium text-theme-secondary">
                  {price}
                </span>
              )}

              {place.openNow !== undefined && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    place.openNow
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {place.openNow ? 'Open now' : 'Closed now'}
                </span>
              )}
            </div>

            {place.weekdayText && place.weekdayText.length > 0 && (
              <details className="mt-2 rounded-md border border-theme bg-theme-subtle p-2 text-xs text-theme-secondary">
                <summary className="cursor-pointer font-medium">
                  Hours of operation
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {place.weekdayText.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              {place.phoneNumber && (
                <a
                  href={`tel:${place.phoneNumber}`}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {place.phoneNumber}
                </a>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}

              {place.googleMapsUrl && (
                <a
                  href={place.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>

            {place.editorialSummary && (
              <p className="mt-2 text-xs leading-snug text-theme-secondary">
                {place.editorialSummary}
              </p>
            )}

            {place.types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {place.types.slice(0, 4).map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-theme bg-theme-subtle px-2 py-0.5 text-[10px] font-medium text-theme-secondary"
                  >
                    {formatTypeLabel(type)}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onAddToItinerary(place)}
              className="btn-primary mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add to itinerary
            </button>
          </>
        )}
      </div>
    </InfoWindow>
  );
}
