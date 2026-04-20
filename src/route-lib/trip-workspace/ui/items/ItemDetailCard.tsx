import type { Item } from '@/types/trip';
import { EventEditorForm } from './EventEditorForm';
import { ItemDetailCardRouteSection } from './ItemDetailCardRouteSection';
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

  const outerClassName = embedded
    ? undefined
    : `animate-in rounded-2xl border border-theme bg-theme-elevated shadow-theme-lg ${
        dayColor ? 'border-t-2' : ''
      }`;
  const outerStyle = !embedded && dayColor ? { borderTopColor: dayColor } : undefined;

  return (
    <div ref={model.rootRef} className={outerClassName} style={outerStyle}>
      <div className={isCompact ? 'p-2.5' : 'p-4'}>
        <ItemDetailCardRouteSection
          dayColor={dayColor}
          compact={isCompact}
          item={item}
          editorValue={model.editorValue}
          isEditingOrigin={model.isEditingOrigin}
          isEditingDestination={model.isEditingDestination}
          hasOrigin={model.hasOrigin}
          hasDest={model.hasDest}
          showTravelControls={model.showTravelControls}
          openInGoogleMapsUrl={model.openInGoogleMapsUrl}
          isCalculatingRoute={model.isCalculatingRoute}
          hasCalculatedRoute={model.hasCalculatedRoute}
          displayedRouteDurationMinutes={model.displayedRouteDurationMinutes}
          onOriginSelect={model.handleOriginSelect}
          onDestinationSelect={model.handleDestinationSelect}
          onOriginEditStart={model.handleOriginEditStart}
          onOriginEditCancel={model.handleOriginEditCancel}
          onDestinationEditStart={model.handleDestinationEditStart}
          onDestinationEditCancel={model.handleDestinationEditCancel}
          onDestinationClear={model.handleDestinationClear}
          onRouteChange={model.handleRouteChange}
          onCalculateRoute={model.handleCalculateRoute}
          onDelete={onDelete}
          onClose={onClose}
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
