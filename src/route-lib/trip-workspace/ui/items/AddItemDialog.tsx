import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { type PlaceSearchResult } from '@/services/maps-repository';
import type { ItemType, RouteType, TransportMode } from '@/types/trip';
import { useEscapeHotkey } from '@/hooks/useEscapeHotkey';
import { EventEditorForm } from './EventEditorForm';
import { ItemRouteEditorSection } from './ItemRouteEditorSection';
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
  defaultTimezoneLabel?: string | null;
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
  defaultTimezoneLabel,
}: AddItemDialogProps) {
  useEscapeHotkey(isOpen, onClose);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
    const placeName = model.resolvedTitle;
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
    model.destPlace,
    model.editor,
    model.resolvedTitle,
    model.selectedPlace,
    onAdd,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusId = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(focusId);
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  const handleDialogKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('aria-hidden'));

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        onKeyDown={handleDialogKeyDown}
        className="relative max-h-[88vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-theme bg-theme-elevated p-5 shadow-theme-lg"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-theme-tertiary hover:bg-theme-subtle hover:text-theme"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-accent" />
          <h2 id="add-item-dialog-title" className="text-base font-semibold text-theme">
            Add Event to Itinerary
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="add-item-title"
              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-tertiary"
            >
              Title
            </label>
            <input
              ref={titleInputRef}
              id="add-item-title"
              type="text"
              value={model.titleValue}
              onChange={(event) => model.handleTitleChange(event.target.value)}
              placeholder={model.selectedPlace?.name || 'Event title'}
              className="input w-full text-sm font-semibold"
            />
          </div>

          <ItemRouteEditorSection
            title="Travel setup"
            collapsible
            isOpen={model.isRouteOpen}
            selectedPlace={model.selectedPlace}
            destinationPlace={model.destPlace}
            customOriginName={model.customName}
            isCustomOrigin={model.isCustomLocation}
            allowCustomOriginName={model.isCustomLocation}
            isEditingOrigin={model.isEditingOrigin}
            isEditingDestination={model.isEditingDestination}
            allowOriginClear
            allowDestinationClear
            editorValue={model.editor}
            routeBadge={model.travelBadge}
            showTravelControls={model.showTravelControls}
            canCalculateRoute={model.canCalculateRoute}
            hasCalculatedRoute={model.hasCalculatedRoute}
            travelDurationMinutes={model.displayedRouteDurationMinutes}
            isCalculatingRoute={model.isCalculatingRoute}
            openInGoogleMapsUrl={model.openInGoogleMapsUrl}
            onToggle={model.handleRouteToggle}
            onOriginEditStart={model.handleOriginEditStart}
            onOriginEditCancel={model.handleOriginEditCancel}
            onDestinationEditStart={model.handleDestinationEditStart}
            onDestinationEditCancel={model.handleDestinationEditCancel}
            onOriginSelect={model.handleOriginSelect}
            onDestinationSelect={model.handleDestinationSelect}
            onOriginClear={model.handleOriginClear}
            onDestinationClear={model.handleDestinationClear}
            onCustomOriginNameChange={model.handleCustomNameChange}
            onRouteChange={model.handleRouteChange}
            onCalculateRoute={model.handleCalculateRoute}
          />

          <section className="border-t border-theme-subtle pt-4">
            <EventEditorForm
              value={model.editor}
              onChange={model.handleEditorChange}
              onSubmit={handleSubmit}
              submitLabel="Add Event to Itinerary"
              isSubmitting={isSubmitting}
              submitDisabled={!model.isOriginValid}
              defaultDate={defaultDate}
              timezoneLabel={defaultTimezoneLabel}
              mapsAvailabilityWindows={model.selectedPlace?.mapsAvailabilityWindows}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
