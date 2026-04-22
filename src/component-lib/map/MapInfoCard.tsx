import { ChevronDown, Globe, Loader2, MapPinned, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { PhotoGallery } from '@/component-lib/shared/PhotoGallery';
import {
  buildHoursOfOperationLines,
  buildHoursOfOperationSummary,
  buildTimeRangeParts,
  getDayTimezoneLabel,
} from '@/lib/day-time-display';
import type { Day, Item } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatPriceLevel(level?: number): string | null {
  if (!level || level < 1) return null;
  return '$'.repeat(level);
}

function formatReviewCount(userRatingsTotal?: number): string | null {
  if (!userRatingsTotal) return null;
  return new Intl.NumberFormat('en-US').format(userRatingsTotal);
}

function buildPlaceFactLine(place: PlaceSearchResult): string[] {
  const facts: string[] = [];
  const rating = place.rating !== undefined ? place.rating.toFixed(1) : null;
  const reviewCount = formatReviewCount(place.userRatingsTotal);
  const price = formatPriceLevel(place.priceLevel);

  if (place.openNow !== undefined) {
    facts.push(place.openNow ? 'Open' : 'Closed');
  }

  if (rating) {
    facts.push(reviewCount ? `${rating} \u2605 (${reviewCount})` : `${rating} \u2605`);
  }

  if (price) {
    facts.push(price);
  }

  return facts;
}

export interface MapInfoCardProps {
  item?: Item | null;
  displayItem?: Item | null;
  day?: Pick<Day, 'date' | 'timezone'> | null;
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
  displayItem,
  day,
  place,
  isLoading,
  error,
  onClose,
  onAddToItinerary,
  onEditItem,
  onDeleteItem,
}: MapInfoCardProps) {
  const isItineraryItem = Boolean(item);
  const renderedItem = displayItem ?? item;
  const photos = place?.photoUrls?.length
    ? place.photoUrls
    : place?.photoRef
      ? [place.photoRef]
      : [];
  const photo = photos[0];
  const hasPhoto = Boolean(photo);
  const displayName = place?.name || item?.placeName || 'Unnamed place';
  const displayAddress = place?.address || item?.address;
  const dayTimezoneLabel = getDayTimezoneLabel(day);
  const timeRange = buildTimeRangeParts({
    start: renderedItem?.scheduledStart,
    end: renderedItem?.scheduledEnd,
    timezoneLabel: dayTimezoneLabel,
    style: 'verbose',
  });
  const hoursSummary = buildHoursOfOperationSummary(day);
  const hoursLines = buildHoursOfOperationLines({
    day,
    weekdayText: place?.weekdayText,
    mapsAvailabilityWindows: place?.mapsAvailabilityWindows,
  });
  const hiddenHoursCount = Math.max(0, hoursLines.length - 1);
  const placeFacts = place ? buildPlaceFactLine(place) : [];
  const placeSummary = place?.editorialSummary ? (
    <div className="space-y-0.5">
      <p className="line-clamp-2 text-sm leading-6 text-theme-secondary">
        {place.editorialSummary}
      </p>
    </div>
  ) : null;
  const scheduleCard =
    item && (timeRange || item.durationMinutes > 0) ? (
      <div className="grid gap-3 rounded-theme-surface bg-theme px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        {timeRange ? (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary">
              Scheduled
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium text-theme">{timeRange.rangeLabel}</p>
              {timeRange.timezoneLabel ? (
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-theme-tertiary">
                  {timeRange.timezoneLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        {item.durationMinutes > 0 ? (
          <div className={timeRange ? 'sm:text-right' : ''}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary">
              Duration
            </p>
            <p className="mt-1 text-sm font-medium text-theme">
              {formatDuration(item.durationMinutes)}
            </p>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="min-w-[280px] max-w-[372px] rounded-theme-shell border border-theme bg-theme-elevated text-theme shadow-theme-lg">
      <div className="space-y-2 px-4 pb-4 pt-4">
        {hasPhoto ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <h3 className="min-w-0 text-xl font-semibold leading-tight text-theme">{displayName}</h3>
              {displayAddress ? (
                <p className="text-sm leading-5 text-theme-secondary">{displayAddress}</p>
              ) : null}
              {placeFacts.length > 0 ? (
                <p className="text-xs font-medium leading-relaxed text-theme-secondary">
                  {placeFacts.join(' \u00b7 ')}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-theme-control bg-theme text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {hasPhoto ? null : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h3 className="min-w-0 text-xl font-semibold leading-tight text-theme">{displayName}</h3>
              {displayAddress ? (
                <p className="text-sm leading-5 text-theme-secondary">{displayAddress}</p>
              ) : null}
              {placeFacts.length > 0 ? (
                <p className="text-xs font-medium leading-relaxed text-theme-secondary">
                  {placeFacts.join(' \u00b7 ')}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-theme-control bg-theme text-theme-secondary transition-colors hover:bg-theme-subtle hover:text-theme"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-theme-surface border border-theme bg-theme-subtle px-3 py-3 text-sm text-theme-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading place details...</span>
          </div>
        )}

        {!isLoading && error && !place && !item ? (
          <p className="rounded-theme-surface border border-red-500/20 bg-red-500/8 px-3 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {(!isLoading || item) && (
          <>
            {photo ? (
              <div className="space-y-1">
                <PhotoGallery urls={photos} altBase={displayName} />
                {scheduleCard}
                {placeSummary}
              </div>
            ) : null}

            {!photo ? scheduleCard : null}
            {!photo ? placeSummary : null}

            {isLoading && item ? (
              <div className="inline-flex items-center gap-2 text-xs text-theme-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading place details...
              </div>
            ) : null}

            {!isLoading && error && item ? (
              <p className="text-xs text-theme-tertiary">{error}</p>
            ) : null}

            {place ? (
              <div className="space-y-2 pt-0">
                {(place.phoneNumber || place.website || place.googleMapsUrl) ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-theme-secondary">
                    {place.phoneNumber ? (
                      <a
                        href={`tel:${place.phoneNumber}`}
                        aria-label={`Call ${place.phoneNumber}`}
                        title="Call"
                        className="inline-flex items-center gap-1.5 text-theme-tertiary transition-colors duration-200 ease-out hover:text-theme-secondary"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call</span>
                      </a>
                    ) : null}
                    {place.website ? (
                      <>
                        {place.phoneNumber ? (
                          <span aria-hidden="true" className="text-theme-tertiary">
                            &middot;
                          </span>
                        ) : null}
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open website"
                          title="Website"
                          className="inline-flex items-center gap-1.5 text-theme-tertiary transition-colors duration-200 ease-out hover:text-theme-secondary"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>Website</span>
                        </a>
                      </>
                    ) : null}
                    {place.googleMapsUrl ? (
                      <>
                        {place.phoneNumber || place.website ? (
                          <span aria-hidden="true" className="text-theme-tertiary">
                            &middot;
                          </span>
                        ) : null}
                        <a
                          href={place.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open directions"
                          title="Directions"
                          className="inline-flex items-center gap-1.5 text-theme-tertiary transition-colors duration-200 ease-out hover:text-theme-secondary"
                        >
                          <MapPinned className="h-3.5 w-3.5" />
                          <span>Directions</span>
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {hoursLines.length > 0 ? (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-theme-tertiary">
                          {hoursSummary}
                        </p>
                        <p className="text-[11px] leading-4 text-theme-secondary">{hoursLines[0]}</p>
                        {hiddenHoursCount > 0 ? (
                          <p className="text-[10px] font-medium text-theme-tertiary group-open:hidden">
                            + {hiddenHoursCount} more {hiddenHoursCount === 1 ? 'day' : 'days'}
                          </p>
                        ) : null}
                      </div>
                      {hoursLines.length > 1 ? (
                        <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-theme-tertiary transition-transform group-open:rotate-180" />
                      ) : null}
                    </summary>
                    {hoursLines.length > 1 ? (
                      <ul className="mt-0.5 space-y-0 text-[11px] leading-4 text-theme-secondary">
                        {hoursLines.slice(1).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </details>
                ) : null}

              </div>
            ) : null}

            <div className="pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {isItineraryItem && item && onEditItem ? (
                  <button
                    type="button"
                    onClick={() => onEditItem(item.itemId)}
                    className="btn-primary inline-flex h-10 items-center gap-1.5 rounded-theme-control px-4 text-xs font-semibold"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Event
                  </button>
                ) : null}

                {isItineraryItem && item && onDeleteItem ? (
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.itemId)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-theme-control bg-theme px-4 text-xs font-medium text-theme-secondary transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : null}

                {!isItineraryItem && place && onAddToItinerary ? (
                  <button
                    type="button"
                    onClick={() => onAddToItinerary(place)}
                    className="btn-primary inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-theme-control px-4 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add to itinerary
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
