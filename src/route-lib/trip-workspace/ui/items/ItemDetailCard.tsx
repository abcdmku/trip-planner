import type { Item } from '@/types/trip';
import { EventEditorForm } from './EventEditorForm';
import {
  ItemRouteEditorHeaderActions,
  ItemRouteEditorSection,
} from './ItemRouteEditorSection';
import { useItemDetailCardModel } from './useItemDetailCardModel';

interface ItemDetailCardProps {
  item: Item;
  dayColor?: string;
  dayDate?: string;
  dayTimezoneLabel?: string | null;
  density?: 'compact' | 'comfortable';
  onUpdate?: (updates: Partial<Item>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function ItemDetailCard({
  item,
  dayColor,
  dayDate,
  dayTimezoneLabel,
  density = 'comfortable',
  onUpdate,
  onDelete,
  onClose,
  embedded = false,
}: ItemDetailCardProps) {
  const isCompact = density === 'compact';
  const model = useItemDetailCardModel({ item, onUpdate });
  const originPlace = model.originPlaceDetails ?? {
    placeId: item.placeId,
    name: item.placeName,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    types: [],
    photoUrls: [],
    mapsAvailabilityWindows: [],
  };
  const destinationPlace =
    model.hasDest
      ? {
          placeId: `${item.itemId}-destination`,
          name: item.destName || 'Destination',
          address: item.destAddress,
          lat: item.destLat,
          lng: item.destLng,
          types: [],
          photoUrls: [],
          mapsAvailabilityWindows: [],
        }
      : null;

  const outerClassName = embedded
    ? undefined
    : `animate-in rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg ${
        dayColor ? 'border-t-2' : ''
      }`;
  const outerStyle = !embedded && dayColor ? { borderTopColor: dayColor } : undefined;

  return (
    <div ref={model.rootRef} className={outerClassName} style={outerStyle}>
      <div className={isCompact ? 'p-2.5' : 'p-4'}>
        <div className={isCompact ? 'mb-3 flex items-start gap-2' : 'mb-4 flex items-start gap-3'}>
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`item-title-${item.itemId}`}
              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-tertiary"
            >
              Title
            </label>
            <input
              id={`item-title-${item.itemId}`}
              data-item-title-input="true"
              type="text"
              value={model.titleValue}
              onChange={(event) => model.handleTitleChange(event.target.value)}
              onBlur={model.handleTitleCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              placeholder={originPlace.name || 'Untitled stop'}
              className={`mt-1 w-full rounded-lg border border-transparent bg-transparent px-0 py-0 text-theme outline-none transition-colors placeholder:text-theme-tertiary focus:border-theme focus:bg-theme focus:px-3 focus:py-2 ${
                isCompact ? 'text-base font-semibold' : 'text-lg font-semibold'
              }`}
            />
          </div>

          {onDelete || onClose ? (
            <div className="flex items-center gap-1">
              <ItemRouteEditorHeaderActions onDelete={onDelete} onClose={onClose} />
            </div>
          ) : null}
        </div>

        <ItemRouteEditorSection
          surfaceStyle="plain"
          compact={isCompact}
          dayColor={dayColor}
          selectedPlace={model.hasOrigin ? originPlace : null}
          destinationPlace={destinationPlace}
          isEditingOrigin={model.isEditingOrigin}
          isEditingDestination={model.isEditingDestination}
          locationCardMode="clickable-card"
          destinationEmptyMode="cta-card"
          allowDestinationClear={model.hasDest}
          editorValue={model.editorValue}
          routeBadge={model.routeBadge}
          showTravelControls={model.showTravelControls}
          openInGoogleMapsUrl={model.openInGoogleMapsUrl}
          isCalculatingRoute={model.isCalculatingRoute}
          hasCalculatedRoute={model.hasCalculatedRoute}
          canCalculateRoute={model.canCalculateRoute}
          travelDurationMinutes={model.displayedRouteDurationMinutes}
          onOriginSelect={model.handleOriginSelect}
          onDestinationSelect={model.handleDestinationSelect}
          onOriginEditStart={model.handleOriginEditStart}
          onOriginEditCancel={model.handleOriginEditCancel}
          onDestinationEditStart={model.handleDestinationEditStart}
          onDestinationEditCancel={model.handleDestinationEditCancel}
          onDestinationClear={model.handleDestinationClear}
          onRouteChange={model.handleRouteChange}
          onCalculateRoute={model.handleCalculateRoute}
        />

        <section className="mt-4 border-t border-theme-subtle pt-4">
          <EventEditorForm
            key={item.itemId}
            value={model.editorValue}
            onChange={model.handleEditorChange}
            compact={isCompact}
            defaultDate={dayDate}
            timezoneLabel={dayTimezoneLabel}
            mapsAvailabilityWindows={model.originPlaceDetails?.mapsAvailabilityWindows}
          />
        </section>
      </div>
    </div>
  );
}
