import { InfoWindow } from '@vis.gl/react-google-maps';
import { Clock3, Globe, Loader2, Phone, Star, X } from 'lucide-react';
import type { Item, ItemType } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';

const TYPE_BADGE: Record<ItemType, { className: string; label: string }> = {
  attraction: { className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300', label: 'Attraction' },
  restaurant: { className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300', label: 'Restaurant' },
  hotel: { className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300', label: 'Hotel' },
  transport: { className: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300', label: 'Transport' },
  activity: { className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', label: 'Activity' },
  other: { className: 'border-theme bg-theme-subtle text-theme-secondary', label: 'Other' },
};

export interface MarkerInfoWindowProps {
  item: Item;
  place: PlaceSearchResult | null;
  isLoadingPlace: boolean;
  placeError: string | null;
  onClose: () => void;
}

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
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

export default function MarkerInfoWindow({
  item,
  place,
  isLoadingPlace,
  placeError,
  onClose,
}: MarkerInfoWindowProps) {
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.other;
  const photo = place?.photoUrls?.[0] ?? place?.photoRef;
  const price = formatPriceLevel(place?.priceLevel);
  const displayName = place?.name || item.placeName || 'Unnamed place';
  const displayAddress = place?.address || item.address;

  return (
    <InfoWindow
      position={{ lat: item.lat, lng: item.lng }}
      onCloseClick={onClose}
      headerDisabled
      className="tp-map-info-window"
      pixelOffset={[0, -40]}
    >
      <div className="relative max-h-[440px] min-w-[260px] max-w-[360px] overflow-y-auto rounded-xl border border-theme bg-theme-elevated p-2 text-theme shadow-theme-sm">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/35 bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>

        {photo && (
          <img
            src={photo}
            alt={displayName}
            className="mb-2 h-36 w-full rounded-lg object-cover pr-9"
            loading="lazy"
          />
        )}

        <h3 className="text-base font-semibold leading-tight text-theme">{displayName}</h3>

        {displayAddress && (
          <p className="mt-0.5 text-xs leading-snug text-theme-secondary">{displayAddress}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
          >
            {badge.label}
          </span>

          {place?.rating !== undefined && (
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

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-theme-secondary">
          {item.scheduledStart && (
            <span className="flex items-center gap-1">
              <ClockIcon />
              {formatTime(item.scheduledStart)}
              {item.scheduledEnd && ` - ${formatTime(item.scheduledEnd)}`}
            </span>
          )}
          {item.durationMinutes > 0 && (
            <span className="flex items-center gap-1">
              <DurationIcon />
              {formatDuration(item.durationMinutes)}
            </span>
          )}
        </div>

        {isLoadingPlace && (
          <div className="mt-2 inline-flex items-center gap-2 text-xs text-theme-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading Google place details...
          </div>
        )}

        {!isLoadingPlace && placeError && (
          <p className="mt-2 text-xs text-red-600">{placeError}</p>
        )}

        {place && (
          <>
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
          </>
        )}
      </div>
    </InfoWindow>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 flex-shrink-0"
    >
      <path
        fillRule="evenodd"
        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .199.079.39.22.53l2 2a.75.75 0 1 0 1.06-1.06L8.75 7.94V4.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DurationIcon() {
  return (
    <Clock3 className="h-3 w-3 flex-shrink-0" />
  );
}
