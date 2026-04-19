import { Clock3, Globe, Loader2, Pencil, Phone, Plus, Star, Trash2, X } from 'lucide-react';
import type { Item, ItemType } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';

const TYPE_BADGE: Record<ItemType, { className: string; label: string }> = {
  attraction: {
    className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    label: 'Attraction',
  },
  restaurant: {
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    label: 'Restaurant',
  },
  hotel: {
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    label: 'Hotel',
  },
  transport: {
    className: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    label: 'Transport',
  },
  activity: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    label: 'Activity',
  },
  other: {
    className: 'border-theme bg-theme-subtle text-theme-secondary',
    label: 'Other',
  },
};

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
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

function getRatingBadgeClasses(rating: number, userRatingsTotal?: number): string {
  if (rating >= 4.7 && (userRatingsTotal ?? 0) > 100) {
    return 'border-teal-400/40 bg-teal-500/15 text-teal-700 shadow-[0_0_14px_rgba(20,184,166,0.45)] dark:text-teal-300 dark:shadow-[0_0_16px_rgba(45,212,191,0.35)]';
  }
  if (rating >= 4) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (rating >= 3) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300';
}

export interface MapInfoCardProps {
  item?: Item | null;
  place: PlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onAddToItinerary?: (place: PlaceSearchResult) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

export function MapInfoCard({
  item,
  place,
  isLoading,
  error,
  onClose,
  onAddToItinerary,
  onEditItem,
  onDeleteItem,
}: MapInfoCardProps) {
  const isItineraryItem = Boolean(item);
  const badge = item ? TYPE_BADGE[item.type] ?? TYPE_BADGE.other : null;
  const photo = place?.photoUrls?.[0] ?? place?.photoRef;
  const price = formatPriceLevel(place?.priceLevel);
  const displayName = place?.name || item?.placeName || 'Unnamed place';
  const displayAddress = place?.address || item?.address;

  return (
    <div className="relative max-h-[440px] min-w-[260px] max-w-[360px] overflow-y-auto rounded-xl border border-theme bg-theme-elevated p-3 text-theme shadow-theme-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/35 bg-black text-white transition-colors hover:bg-zinc-900"
      >
        <X className="h-4 w-4" />
      </button>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-theme-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading place details...</span>
        </div>
      )}

      {!isLoading && error && !place && !item && <p className="py-4 text-sm text-red-600">{error}</p>}

      {(!isLoading || item) && (
        <>
          {photo && (
            <img
              src={photo}
              alt={displayName}
              className="mb-2 h-36 w-full rounded-lg object-cover"
              loading="lazy"
            />
          )}

          <h3 className="text-base font-semibold leading-tight text-theme">{displayName}</h3>
          {displayAddress && <p className="mt-0.5 text-xs leading-snug text-theme-secondary">{displayAddress}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {badge && (
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            )}

            {place?.rating !== undefined && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getRatingBadgeClasses(
                  place.rating,
                  place.userRatingsTotal,
                )}`}
              >
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

            {place?.openNow !== undefined && (
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

          {item && (item.scheduledStart || item.durationMinutes > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-theme-secondary">
              {item.scheduledStart && (
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3 flex-shrink-0" />
                  {formatTime(item.scheduledStart)}
                  {item.scheduledEnd && ` - ${formatTime(item.scheduledEnd)}`}
                </span>
              )}
              {item.durationMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3 flex-shrink-0" />
                  {formatDuration(item.durationMinutes)}
                </span>
              )}
            </div>
          )}

          {isLoading && item && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-theme-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading place details...
            </div>
          )}

          {!isLoading && error && item && <p className="mt-2 text-xs text-theme-tertiary">{error}</p>}

          {place && (
            <>
              {place.weekdayText && place.weekdayText.length > 0 && (
                <details className="mt-2 rounded-md border border-theme bg-theme-subtle p-2 text-xs text-theme-secondary">
                  <summary className="cursor-pointer font-medium">Hours of operation</summary>
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
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
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
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Open in Google Maps
                  </a>
                )}
              </div>

              {place.editorialSummary && (
                <p className="mt-2 text-xs leading-snug text-theme-secondary">{place.editorialSummary}</p>
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
            </>
          )}

          <div className="mt-3 flex items-center gap-2">
            {isItineraryItem && item && onEditItem && (
              <button
                type="button"
                onClick={() => onEditItem(item.itemId)}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Event
              </button>
            )}

            {isItineraryItem && item && onDeleteItem && (
              <button
                type="button"
                onClick={() => onDeleteItem(item.itemId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-theme bg-theme-subtle px-3 py-1.5 text-xs font-medium text-theme-secondary transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}

            {!isItineraryItem && place && onAddToItinerary && (
              <button
                type="button"
                onClick={() => onAddToItinerary(place)}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to itinerary
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
