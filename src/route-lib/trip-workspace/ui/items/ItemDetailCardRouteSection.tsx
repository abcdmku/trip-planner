import { Trash2, X } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import { ItemLocationCard, ItemRouteStopRow, ItemRouteTravelControls } from '@/component-lib/items';
import type { Item } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { EventEditorValue } from './EventEditorForm';

interface ItemDetailCardRouteSectionProps {
  dayColor?: string;
  compact?: boolean;
  item: Item;
  editorValue: EventEditorValue;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  hasOrigin: boolean;
  hasDest: boolean;
  showTravelControls: boolean;
  openInGoogleMapsUrl?: string;
  isCalculatingRoute: boolean;
  hasCalculatedRoute: boolean;
  displayedRouteDurationMinutes: number;
  onOriginSelect: (place: PlaceSearchResult) => void;
  onDestinationSelect: (place: PlaceSearchResult) => void;
  onOriginEditStart: () => void;
  onOriginEditCancel: () => void;
  onDestinationEditStart: () => void;
  onDestinationEditCancel: () => void;
  onDestinationClear: () => void;
  onRouteChange: (next: { transportMode: EventEditorValue['transportMode']; itemRouteType: EventEditorValue['itemRouteType'] }) => void;
  onCalculateRoute: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export function ItemDetailCardRouteSection({
  dayColor,
  compact = false,
  item,
  editorValue,
  isEditingOrigin,
  isEditingDestination,
  hasOrigin,
  hasDest,
  showTravelControls,
  openInGoogleMapsUrl,
  isCalculatingRoute,
  hasCalculatedRoute,
  displayedRouteDurationMinutes,
  onOriginSelect,
  onDestinationSelect,
  onOriginEditStart,
  onOriginEditCancel,
  onDestinationEditStart,
  onDestinationEditCancel,
  onDestinationClear,
  onRouteChange,
  onCalculateRoute,
  onDelete,
  onClose,
}: ItemDetailCardRouteSectionProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <ItemRouteStopRow marker="origin" accentColor={dayColor} showConnector>
          {isEditingOrigin ? (
            <div className="space-y-2">
              <PlaceSearch autoFocus onSelect={onOriginSelect} placeholder="Search location..." />
              <button
                type="button"
                onClick={onOriginEditCancel}
                className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <ItemLocationCard
              title={item.placeName}
              subtitle={item.address}
              onClick={onOriginEditStart}
              ariaLabel="Edit origin"
            />
          )}
        </ItemRouteStopRow>

        {!isEditingOrigin && (onDelete || onClose) ? (
          <div className="absolute right-0 top-2 z-10 flex items-center gap-1">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-1 text-theme-tertiary hover:bg-red-500/10 hover:text-red-500"
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ItemRouteStopRow marker="destination" accentColor={dayColor}>
        {isEditingDestination ? (
          <div className="space-y-2">
            <PlaceSearch autoFocus onSelect={onDestinationSelect} placeholder="Search destination..." />
            <button
              type="button"
              onClick={onDestinationEditCancel}
              className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <ItemLocationCard
            title={hasDest ? item.destName || 'Destination' : 'Add destination'}
            subtitle={hasDest ? item.destAddress : undefined}
            description={
              hasDest ? undefined : 'Add one to estimate travel time and open the route in Maps.'
            }
            onClick={onDestinationEditStart}
            ariaLabel={hasDest ? 'Edit destination' : 'Add destination'}
            paddedForActions={hasDest}
            actions={
              hasDest ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDestinationClear();
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-theme-tertiary opacity-0 transition-all hover:bg-theme hover:text-theme group-hover/stop:opacity-100 group-focus-within/stop:opacity-100"
                  aria-label="Clear destination"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null
            }
          />
        )}
      </ItemRouteStopRow>

      {showTravelControls ? (
        <div className="border-t border-theme-subtle pt-3">
          <ItemRouteTravelControls
            transportMode={editorValue.transportMode}
            itemRouteType={editorValue.itemRouteType}
            onChange={onRouteChange}
            compact={compact}
            hasOrigin={hasOrigin}
            hasDestination={hasDest}
            openInGoogleMapsUrl={openInGoogleMapsUrl}
            onCalculateRoute={onCalculateRoute}
            isCalculatingRoute={isCalculatingRoute}
            canCalculateRoute={hasOrigin && hasDest && editorValue.itemRouteType === 'directions'}
            hasCalculatedRoute={hasCalculatedRoute}
            travelDurationMinutes={displayedRouteDurationMinutes}
          />
        </div>
      ) : null}
    </div>
  );
}
