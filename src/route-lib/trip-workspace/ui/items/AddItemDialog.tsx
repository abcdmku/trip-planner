import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { type PlaceSearchResult } from '@/services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { EventEditorForm } from './EventEditorForm';
import { AddItemDialogRouteSection } from './AddItemDialogRouteSection';
import { useAddItemDialogModel } from './useAddItemDialogModel';

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
    destLat: number;
    destLng: number;
    destName: string;
    destAddress: string;
    transportMode: TransportMode;
    itemRouteType: RouteType;
    itemRoutePathEncoded?: string;
    itemRouteDistanceMeters?: number;
    itemRouteDurationMinutes?: number;
    availabilityWindows: string;
    timelineLocked: boolean;
    travelFromItemId?: string;
    travelToItemId?: string;
  }) => void;
  isSubmitting?: boolean;
  initialPlace?: PlaceSearchResult | null;
  initialDestination?: PlaceSearchResult | null;
  initialLocation?: { lat: number; lng: number } | null;
  initialStartTime?: string;
  initialEndTime?: string;
  initialType?: ItemType;
  initialTransportMode?: TransportMode;
  initialRouteType?: RouteType;
  initialAvailabilityWindows?: string;
  initialTimelineLocked?: boolean;
  initialTravelFromItemId?: string;
  initialTravelToItemId?: string;
  defaultDate?: string;
}

export function AddItemDialog({
  isOpen,
  onClose,
  onAdd,
  isSubmitting,
  initialPlace,
  initialDestination,
  initialLocation,
  initialStartTime,
  initialEndTime,
  initialType,
  initialTransportMode,
  initialRouteType,
  initialAvailabilityWindows,
  initialTimelineLocked,
  initialTravelFromItemId,
  initialTravelToItemId,
  defaultDate,
}: AddItemDialogProps) {
  useEscapeHotkey(isOpen, onClose);

  const model = useAddItemDialogModel({
    isOpen,
    initialPlace,
    initialDestination,
    initialLocation,
    initialStartTime,
    initialEndTime,
    initialType,
    initialTransportMode,
    initialRouteType,
    initialAvailabilityWindows,
    initialTimelineLocked,
  });

  const handleSubmit = useCallback(() => {
    if (!model.selectedPlace) return;
    const placeName = model.isCustomLocation ? model.customName.trim() : model.selectedPlace.name;
    if (!placeName) return;
    onAdd({
      placeId: model.selectedPlace.placeId,
      placeName,
      lat: model.selectedPlace.lat,
      lng: model.selectedPlace.lng,
      address: model.selectedPlace.address,
      type: model.editor.type,
      durationMinutes: model.editor.durationMinutes,
      notesMd: model.editor.notesMd,
      scheduledStart: model.editor.scheduledStart,
      scheduledEnd: model.editor.scheduledEnd,
      destLat: model.destPlace?.lat ?? 0,
      destLng: model.destPlace?.lng ?? 0,
      destName: model.destPlace?.name ?? '',
      destAddress: model.destPlace?.address ?? '',
      transportMode: model.editor.transportMode,
      itemRouteType: model.editor.itemRouteType,
      itemRoutePathEncoded: model.calculatedRoute?.itemRoutePathEncoded ?? '',
      itemRouteDistanceMeters: model.calculatedRoute?.itemRouteDistanceMeters ?? 0,
      itemRouteDurationMinutes: model.calculatedRoute?.itemRouteDurationMinutes ?? 0,
      availabilityWindows: model.editor.availabilityWindows,
      timelineLocked: model.editor.timelineLocked,
      travelFromItemId: initialTravelFromItemId ?? '',
      travelToItemId: initialTravelToItemId ?? '',
    });
  }, [
    initialTravelFromItemId,
    initialTravelToItemId,
    model.calculatedRoute,
    model.customName,
    model.destPlace,
    model.editor,
    model.isCustomLocation,
    model.selectedPlace,
    onAdd,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-theme">Add Event to Itinerary</h2>
        </div>

        <AddItemDialogRouteSection
          isRouteOpen={model.isRouteOpen}
          isCalculatingRoute={model.isCalculatingRoute}
          routeBadge={model.travelBadge}
          showTravelControls={model.showTravelControls}
          selectedPlace={model.selectedPlace}
          destPlace={model.destPlace}
          customName={model.customName}
          isCustomLocation={model.isCustomLocation}
          isEditingOrigin={model.isEditingOrigin}
          isEditingDestination={model.isEditingDestination}
          editor={model.editor}
          openInGoogleMapsUrl={model.openInGoogleMapsUrl}
          canCalculateRoute={Boolean(
            model.selectedPlace && model.destPlace && model.editor.itemRouteType === 'directions',
          )}
          hasCalculatedRoute={Boolean(model.calculatedRoute)}
          travelDurationMinutes={model.calculatedRoute?.itemRouteDurationMinutes ?? 0}
          onRouteToggle={model.handleRouteToggle}
          onOriginEditStart={model.handleOriginEditStart}
          onOriginEditCancel={model.handleOriginEditCancel}
          onDestinationEditStart={model.handleDestinationEditStart}
          onDestinationEditCancel={model.handleDestinationEditCancel}
          onOriginSelect={model.handleOriginSelect}
          onDestinationSelect={model.handleDestinationSelect}
          onOriginClear={model.handleOriginClear}
          onDestinationClear={model.handleDestinationClear}
          onCustomNameChange={model.handleCustomNameChange}
          onRouteChange={model.handleRouteChange}
          onCalculateRoute={model.handleCalculateRoute}
        />

        <EventEditorForm
          value={model.editor}
          onChange={model.handleEditorChange}
          onSubmit={handleSubmit}
          submitLabel="Add Event to Itinerary"
          isSubmitting={isSubmitting}
          submitDisabled={!model.isOriginValid}
          defaultDate={defaultDate}
          mapsAvailabilityWindows={model.selectedPlace?.mapsAvailabilityWindows}
        />
      </div>
    </div>
  );
}
