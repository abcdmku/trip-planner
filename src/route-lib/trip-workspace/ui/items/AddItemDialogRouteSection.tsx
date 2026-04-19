import { ChevronDown, Navigation, X } from 'lucide-react';
import { PlaceSearch } from './PlaceSearch';
import { ItemLocationCard, ItemRouteSummary, ItemRouteTravelControls } from '@/component-lib/items';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { RouteType, TransportMode } from '@/types/trip';
import type { EventEditorValue } from './EventEditorForm';

interface AddItemDialogRouteSectionProps {
  isRouteOpen: boolean;
  isCalculatingRoute: boolean;
  routeBadge: string;
  showTravelControls: boolean;
  selectedPlace: PlaceSearchResult | null;
  destPlace: PlaceSearchResult | null;
  customName: string;
  isCustomLocation: boolean;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  editor: EventEditorValue;
  openInGoogleMapsUrl?: string;
  canCalculateRoute: boolean;
  hasCalculatedRoute: boolean;
  travelDurationMinutes: number;
  onRouteToggle: () => void;
  onOriginEditStart: () => void;
  onOriginEditCancel: () => void;
  onDestinationEditStart: () => void;
  onDestinationEditCancel: () => void;
  onOriginSelect: (place: PlaceSearchResult) => void;
  onDestinationSelect: (place: PlaceSearchResult) => void;
  onOriginClear: () => void;
  onDestinationClear: () => void;
  onCustomNameChange: (value: string) => void;
  onRouteChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
  onCalculateRoute: () => void;
}

export function AddItemDialogRouteSection({
  isRouteOpen,
  isCalculatingRoute,
  routeBadge,
  showTravelControls,
  selectedPlace,
  destPlace,
  customName,
  isCustomLocation,
  isEditingOrigin,
  isEditingDestination,
  editor,
  openInGoogleMapsUrl,
  canCalculateRoute,
  hasCalculatedRoute,
  travelDurationMinutes,
  onRouteToggle,
  onOriginEditStart,
  onOriginEditCancel,
  onDestinationEditStart,
  onDestinationEditCancel,
  onOriginSelect,
  onDestinationSelect,
  onOriginClear,
  onDestinationClear,
  onCustomNameChange,
  onRouteChange,
  onCalculateRoute,
}: AddItemDialogRouteSectionProps) {
  return (
    <div className="mb-3 rounded-xl border border-theme bg-theme-subtle">
      <button
        type="button"
        onClick={onRouteToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[rgba(var(--color-bg-elevated),0.6)]"
      >
        <span className="text-[13px] font-medium text-theme-secondary">Route</span>
        <span className="flex-1" />
        {isCalculatingRoute ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Calculating...
          </span>
        ) : (
          <span className="max-w-[55%] truncate text-[11px] text-theme-tertiary">
            {showTravelControls ? routeBadge : 'Origin and destination'}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-theme-tertiary transition-transform ${isRouteOpen ? '' : '-rotate-90'}`}
        />
      </button>

      <div className="border-t border-theme-subtle p-3">
        {isRouteOpen ? (
          <div className="space-y-2.5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-theme">
                    {selectedPlace
                      ? isCustomLocation
                        ? customName.trim() || 'Map pin'
                        : selectedPlace.name
                      : 'Choose starting point'}
                  </p>
                  {selectedPlace?.address ? (
                    <p className="truncate text-[10px] text-theme-tertiary">
                      {selectedPlace.address}
                    </p>
                  ) : null}
                </div>
              </div>

              {isEditingOrigin ? (
                <div className="space-y-1.5">
                  <PlaceSearch
                    autoFocus
                    onSelect={onOriginSelect}
                    placeholder="Search origin..."
                  />
                  <button
                    type="button"
                    onClick={onOriginEditCancel}
                    className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : isCustomLocation ? (
                <div className="space-y-2">
                  <ItemLocationCard
                    title="Map pin"
                    subtitle={selectedPlace?.address}
                    paddedForActions
                    actions={
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={onOriginEditStart}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={onOriginClear}
                          className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                          aria-label="Clear origin"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    }
                  />

                  <div>
                    <label className="mb-0.5 block text-[10px] text-theme-tertiary">Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => onCustomNameChange(e.target.value)}
                      placeholder="Name this location"
                      className="input w-full py-1.5 text-xs"
                    />
                    {!customName.trim() ? (
                      <p className="mt-1 text-[10px] text-red-600">
                        A name is required for map pins.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : selectedPlace ? (
                <ItemLocationCard
                  title={selectedPlace.name}
                  subtitle={selectedPlace.address}
                  paddedForActions
                  actions={
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={onOriginEditStart}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={onOriginClear}
                        className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                        aria-label="Clear origin"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  }
                />
              ) : (
                <PlaceSearch onSelect={onOriginSelect} placeholder="Search origin..." />
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-theme">
                    {destPlace ? destPlace.name : 'No destination'}
                  </p>
                  {destPlace?.address ? (
                    <p className="truncate text-[10px] text-theme-tertiary">{destPlace.address}</p>
                  ) : !destPlace ? (
                    <p className="truncate text-[10px] text-theme-tertiary">Optional</p>
                  ) : null}
                </div>
                {showTravelControls ? (
                  <span className="shrink-0 text-[11px] font-medium text-theme-tertiary">
                    {routeBadge}
                  </span>
                ) : null}
              </div>

              {isEditingDestination || !destPlace ? (
                <div className="space-y-1.5">
                  <PlaceSearch
                    autoFocus
                    onSelect={onDestinationSelect}
                    placeholder="Search destination..."
                  />
                  {isEditingDestination && destPlace ? (
                    <button
                      type="button"
                      onClick={onDestinationEditCancel}
                      className="text-[11px] font-medium text-theme-tertiary hover:text-theme-secondary"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : (
                <ItemLocationCard
                  title={destPlace.name}
                  subtitle={destPlace.address}
                  paddedForActions
                  actions={
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={onDestinationEditStart}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary hover:bg-theme-subtle"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={onDestinationClear}
                        className="rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme-secondary"
                        aria-label="Clear destination"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  }
                />
              )}
            </div>

            {showTravelControls ? (
              <div className="border-t border-theme-subtle pt-2.5">
                <ItemRouteTravelControls
                  transportMode={editor.transportMode}
                  itemRouteType={editor.itemRouteType}
                  onChange={onRouteChange}
                  hasOrigin={Boolean(selectedPlace)}
                  hasDestination={Boolean(destPlace)}
                  openInGoogleMapsUrl={openInGoogleMapsUrl}
                  onCalculateRoute={onCalculateRoute}
                  isCalculatingRoute={isCalculatingRoute}
                  canCalculateRoute={canCalculateRoute}
                  hasCalculatedRoute={hasCalculatedRoute}
                  travelDurationMinutes={travelDurationMinutes}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <ItemRouteSummary
            originTitle={
              selectedPlace
                ? isCustomLocation
                  ? customName.trim() || 'Map pin'
                  : selectedPlace.name
                : 'Choose starting point'
            }
            originSubtitle={selectedPlace?.address}
            destinationTitle={destPlace ? destPlace.name : 'No destination'}
            destinationSubtitle={destPlace?.address}
            emptyDestinationLabel="Optional"
            travelBadge={showTravelControls ? routeBadge : undefined}
          />
        )}
      </div>
    </div>
  );
}
