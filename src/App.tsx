import { createBrowserRouter, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { AuthGuard } from './components/auth/AuthGuard';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './hooks/useAuth';
import { useTrip } from './hooks/useTrip';
import { useRealtime } from './contexts/RealtimeContext';
import { useUI } from './hooks/useUI';
import { CreateTripDialog } from './components/trips/CreateTripDialog';
import { DayTabs } from './components/days/DayTabs';
import { DayEditor } from './components/days/DayEditor';
import { DeleteDayDialog } from './components/days/DeleteDayDialog';
import { ItineraryList } from './components/items/ItineraryList';
import { AddItemDialog } from './components/items/AddItemDialog';
import { ItemEditorDialog } from './components/items/ItemEditorDialog';
import { VerticalTimeline } from './components/timeline/VerticalTimeline';
import { buildTimelineRenderItemsByDay } from './components/timeline/vertical/render-segments';
import MapShell from './components/map/MapShell';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAddDay, useDeleteDay, useUpdateDay } from './hooks/useDays';
import { useAddItem, useUpdateItem, useDeleteItem, useReorderItems } from './hooks/useItems';
import { useLegs, useUpdateLegMode, useUpdateLegRouteType, useRecalculateLegs } from './hooks/useLegs';
import { useUpdateTrip } from './hooks/useTrip';
import { useCreateTripInvite, useDeleteTripInvite, useDeleteTripMember } from './hooks/useTripSharing';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useUndoRedoHotkeys } from './hooks/useUndoRedoHotkeys';
import { START_LOCATION_ID } from './services/leg-recompute';
import { createTrip, listTrips, ApiError } from './services/api-client';
import type { PlaceSearchResult } from './services/maps-repository';
import { deriveTimelineConnectors, type TimelineConnector, type TimelineConnectorWithTiming } from './lib/connectors';
import { getAutoDayLabel, getDayDisplayLabel } from './lib/day-labels';
import { resolveAppendDropAfterLast, minutesToTime } from './lib/timeline-drop';
import { DEFAULT_TIMELINE_SNAP_MINUTES, normalizeTimelineSnapMinutes } from './lib/timeline-snap';
import { Plane, Loader2 } from 'lucide-react';
import type { Day, Item, Leg, Trip, TransportMode, RouteType } from './types/trip';
import type { PresenceItemPreview, TripListItem } from './types/api';
import LegInfoPopup from './components/map/LegInfoPopup';
import { DragOverlay } from './components/items/DragOverlay';
import { CursorPresenceOverlay } from './components/presence/CursorPresenceOverlay';
import { ConflictBanner } from './components/sync/ConflictBanner';
import { TripShareMenu } from './components/trips/TripShareMenu';

const TIMELINE_SNAP_STORAGE_KEY = 'trip-planner:timeline-snap-minutes';

function loadTimelineSnapMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMELINE_SNAP_MINUTES;

  try {
    const stored = window.localStorage.getItem(TIMELINE_SNAP_STORAGE_KEY);
    return normalizeTimelineSnapMinutes(stored === null ? undefined : Number(stored));
  } catch {
    return DEFAULT_TIMELINE_SNAP_MINUTES;
  }
}

function TripSetup({
  onCreateTrip,
  onOpenTrip,
  trips,
  isLoadingTrips,
  tripsError,
}: {
  onCreateTrip: (name: string, startDate: string, endDate: string, timezone: string) => void;
  onOpenTrip: (tripId: string) => void;
  trips: TripListItem[];
  isLoadingTrips: boolean;
  tripsError: string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-theme">Trip Planner</h1>
          <p className="mt-2 text-sm text-theme-secondary">
            Create a new trip or open an existing one
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-semibold"
          >
            <Plane className="h-5 w-5" />
            Create New Trip
          </button>
        </div>

        <div className="rounded-2xl border border-theme bg-theme-elevated p-3 shadow-theme-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-theme">
              Your Trips ({trips.length})
            </h2>
            {isLoadingTrips && <Loader2 className="h-4 w-4 animate-spin text-theme-secondary" />}
          </div>

          {tripsError ? (
            <p className="text-xs text-theme-secondary">{tripsError}</p>
          ) : isLoadingTrips && trips.length === 0 ? (
            <p className="text-xs text-theme-secondary">Loading trips...</p>
          ) : trips.length === 0 ? (
            <p className="text-xs text-theme-secondary">
              No trips yet. Create your first trip to start planning.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onOpenTrip(trip.id)}
                  className="w-full rounded-xl border border-theme bg-theme px-3 py-2 text-left shadow-theme-sm transition-colors hover:bg-theme-subtle"
                >
                  <div className="truncate text-sm font-medium text-theme">{trip.name}</div>
                  <div className="mt-1 text-[11px] text-theme-secondary">
                    {trip.startDate} to {trip.endDate}
                  </div>
                  <div className="mt-1 text-[11px] text-theme-secondary">
                    {trip.role} · Updated {new Date(trip.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTripDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, startDate, endDate, timezone) => {
          setShowCreate(false);
          onCreateTrip(name, startDate, endDate, timezone);
        }}
      />
    </div>
  );
}

function TripApp({ tripId }: { tripId: string }) {
  const ENABLE_LEGACY_LEGS = false;
  const { user, logout } = useAuth();
  const {
    connectionState,
    localConnectionId,
    getTripCursors,
    getTripItemPreviews,
    sendCursor,
    clearCursor,
    sendItemPreview,
    getRemoteEditNotice,
    dismissRemoteEditNotice,
  } = useRealtime();
  const { setActiveTab, selectedItemId, setSelectedItemId } = useUI();
  const {
    trip,
    days,
    items: committedItems,
    data: tripData,
    members,
    pendingInvites,
    isLoading,
    isFetching,
    error,
  } = useTrip(tripId);
  const { legs } = useLegs(tripId);
  const { ensureSynced } = useUndoRedo(tripId);
  const createInvite = useCreateTripInvite(tripId);
  const deleteInvite = useDeleteTripInvite(tripId);
  const deleteMember = useDeleteTripMember(tripId);

  useUndoRedoHotkeys(tripId);

  const hasSyncedUndoRef = useRef(false);
  const wasFetchingUndoRef = useRef(false);

  useEffect(() => {
    hasSyncedUndoRef.current = false;
    wasFetchingUndoRef.current = false;
  }, [tripId]);

  useEffect(() => {
    if (!tripData) return;

    // Initial sync once data is present.
    if (!hasSyncedUndoRef.current && !isFetching) {
      ensureSynced(tripData);
      hasSyncedUndoRef.current = true;
    }

    // Re-sync only after a refetch completes (avoids wiping history on optimistic updates).
    const wasFetching = wasFetchingUndoRef.current;
    if (wasFetching && !isFetching) {
      ensureSynced(tripData);
    }
    wasFetchingUndoRef.current = isFetching;
  }, [ensureSynced, isFetching, tripData]);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | undefined>();
  const [newDayDefaultLabel, setNewDayDefaultLabel] = useState('');
  const [newDayDefaultDate, setNewDayDefaultDate] = useState('');
  const [pendingDayDelete, setPendingDayDelete] = useState<{ dayId: string; label: string; eventCount: number } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [mapSelectedPlace, setMapSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [mapClickLocation, setMapClickLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSelectedDestination, setMapSelectedDestination] = useState<PlaceSearchResult | null>(null);
  const [mapEventFilter, setMapEventFilter] = useState<'all' | 'committed'>('all');
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null);
  const [addItemInitialTimes, setAddItemInitialTimes] = useState<{ start: string; end: string } | null>(null);
  const [addItemInitialType, setAddItemInitialType] = useState<Item['type'] | undefined>();
  const [addItemInitialTransportMode, setAddItemInitialTransportMode] = useState<TransportMode | undefined>();
  const [addItemInitialRouteType, setAddItemInitialRouteType] = useState<RouteType | undefined>();
  const [addItemInitialAvailabilityWindows, setAddItemInitialAvailabilityWindows] = useState<string | undefined>();
  const [addItemInitialTimelineLocked, setAddItemInitialTimelineLocked] = useState<boolean | undefined>();
  const [addItemInitialTravelLink, setAddItemInitialTravelLink] = useState<{ fromItemId: string; toItemId: string } | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);
  const [timelineSnapMinutes, setTimelineSnapMinutes] = useState(loadTimelineSnapMinutes);
  const [suppressedConnectorIds, setSuppressedConnectorIds] = useState<Set<string>>(new Set());
  const [showTimelineConnectors, setShowTimelineConnectors] = useState(true);
  const dragClearTimerRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const isDesktopPresenceEnabled = useMemo(
    () => window.matchMedia('(pointer:fine) and (hover:hover)').matches,
    [],
  );
  const tripCursors = getTripCursors(tripId);
  const tripItemPreviews = getTripItemPreviews(tripId);
  const remoteEditNotice = getRemoteEditNotice(tripId);

  const previewByItemId = useMemo(() => {
    const next = new Map<string, PresenceItemPreview>();
    for (const preview of tripItemPreviews) {
      if (preview.connectionId === localConnectionId) continue;
      const existing = next.get(preview.itemId);
      if (!existing || existing.updatedAt < preview.updatedAt) {
        next.set(preview.itemId, preview);
      }
    }
    return next;
  }, [localConnectionId, tripItemPreviews]);

  const renderItems = useMemo(
    () =>
      committedItems.map((item) => {
        const preview = previewByItemId.get(item.itemId);
        if (!preview) return item;
        return {
          ...item,
          dayId: preview.dayId,
          scheduledStart: preview.scheduledStart,
          scheduledEnd: preview.scheduledEnd,
          durationMinutes: preview.durationMinutes,
        };
      }),
    [committedItems, previewByItemId],
  );

  useEffect(() => {
    if (!workspaceRef.current || !isDesktopPresenceEnabled) return;

    let frame = 0;
    const workspace = workspaceRef.current;
    const clearLocalCursor = () => {
      clearCursor(tripId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = workspaceRef.current?.getBoundingClientRect();
        if (!rect) return;
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          clearLocalCursor();
          return;
        }
        sendCursor(
          tripId,
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
        );
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearLocalCursor();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('blur', clearLocalCursor);
    workspace.addEventListener('pointerleave', clearLocalCursor);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', clearLocalCursor);
      workspace.removeEventListener('pointerleave', clearLocalCursor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearLocalCursor();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [clearCursor, isDesktopPresenceEnabled, sendCursor, tripId]);

  const resetAddItemDraft = useCallback(() => {
    setMapSelectedPlace(null);
    setMapClickLocation(null);
    setMapSelectedDestination(null);
    setAddItemInitialTimes(null);
    setAddItemInitialType(undefined);
    setAddItemInitialTransportMode(undefined);
    setAddItemInitialRouteType(undefined);
    setAddItemInitialAvailabilityWindows(undefined);
    setAddItemInitialTimelineLocked(undefined);
    setAddItemInitialTravelLink(null);
  }, []);

  const closeAddItemDialog = useCallback(() => {
    setShowAddItem(false);
    resetAddItemDraft();
  }, [resetAddItemDraft]);

  const clearLiveItemPreview = useCallback(() => {
    sendItemPreview(tripId, null);
  }, [sendItemPreview, tripId]);

  const scheduleDragCleanup = useCallback((defer: boolean) => {
    if (dragClearTimerRef.current !== null) {
      window.clearTimeout(dragClearTimerRef.current);
      dragClearTimerRef.current = null;
    }

    if (!defer) {
      setDraggingItemId(null);
      setIsDragOverTimeline(false);
      clearLiveItemPreview();
      return;
    }

    dragClearTimerRef.current = window.setTimeout(() => {
      dragClearTimerRef.current = null;
      setDraggingItemId(null);
      setIsDragOverTimeline(false);
      clearLiveItemPreview();
    }, 0);
  }, [clearLiveItemPreview]);

  const handleExternalDragStart = useCallback((itemId: string) => {
    if (dragClearTimerRef.current !== null) {
      window.clearTimeout(dragClearTimerRef.current);
      dragClearTimerRef.current = null;
    }
    clearLiveItemPreview();
    setDraggingItemId(itemId);
  }, [clearLiveItemPreview]);

  const handleExternalDragEnd = useCallback(() => {
    scheduleDragCleanup(true);
  }, [scheduleDragCleanup]);

  useEffect(() => {
    window.localStorage.setItem(TIMELINE_SNAP_STORAGE_KEY, String(timelineSnapMinutes));
  }, [timelineSnapMinutes]);

  useEffect(() => {
    const handleWindowDrop = () => scheduleDragCleanup(false);
    const handleWindowDragEnd = () => scheduleDragCleanup(true);

    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDrop);
      if (dragClearTimerRef.current !== null) {
        window.clearTimeout(dragClearTimerRef.current);
        dragClearTimerRef.current = null;
      }
    };
  }, [scheduleDragCleanup]);

  const addDay = useAddDay(tripId);
  const updateDay = useUpdateDay(tripId);
  const deleteDay = useDeleteDay(tripId);
  const addItem = useAddItem(tripId);
  const updateItem = useUpdateItem(tripId);
  const deleteItem = useDeleteItem(tripId);
  const reorderItems = useReorderItems(tripId);
  const updateTrip = useUpdateTrip(tripId);
  const updateLegMode = useUpdateLegMode(tripId);
  const updateLegRouteType = useUpdateLegRouteType(tripId);
  const recalculateLegs = useRecalculateLegs(tripId);

  // Build item lookup for leg info popup
  const itemMap = useMemo(
    () => new Map(committedItems.map((item) => [item.itemId, item])),
    [committedItems],
  );

  // Auto-calculate legs when items exist but no legs cover them.
  // Uses a stable fingerprint to avoid re-running on every render.
  const itemFingerprint = useMemo(
    () => committedItems.map((i) => `${i.itemId}:${i.sortOrder}:${i.dayId}`).join(','),
    [committedItems],
  );

  useEffect(() => {
    if (!ENABLE_LEGACY_LEGS) return;
    if (committedItems.length < 2 || recalculateLegs.isPending) return;

    // Check if existing legs already cover the current item pairs.
    const legKeys = new Set(legs.map((l) => `${l.fromItemId}::${l.toItemId}`));
    const dayGroups = new Map<string, Item[]>();
    for (const item of committedItems) {
      const group = dayGroups.get(item.dayId) ?? [];
      group.push(item);
      dayGroups.set(item.dayId, group);
    }

    let needsRecalc = false;
    const groupsToRecalc: Item[][] = [];

    for (const dayItems of dayGroups.values()) {
      const sorted = [...dayItems].sort((a, b) => a.sortOrder - b.sortOrder);
      if (sorted.length < 2) continue;
      let dayNeedsRecalc = false;
      for (let i = 0; i < sorted.length - 1; i++) {
        if (!legKeys.has(`${sorted[i].itemId}::${sorted[i + 1].itemId}`)) {
          dayNeedsRecalc = true;
          break;
        }
      }
      if (dayNeedsRecalc) {
        needsRecalc = true;
        groupsToRecalc.push(sorted);
      }
    }

    if (!needsRecalc) return;

    const defaultMode = trip?.defaultMode ?? 'driving';
    for (const dayItems of groupsToRecalc) {
      recalculateLegs.mutate({ items: dayItems, defaultMode });
    }
  }, [ENABLE_LEGACY_LEGS, committedItems, itemFingerprint, legs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateTrip = useCallback(
    (updates: Partial<Trip>) => {
      if (!trip) return;
      updateTrip.mutate({ ...trip, ...updates });
    },
    [trip, updateTrip],
  );

  const handleModeChange = useCallback(
    (leg: Leg, newMode: TransportMode) => {
      const fromItem = itemMap.get(leg.fromItemId);
      const toItem = itemMap.get(leg.toItemId);
      if (!fromItem || !toItem) return;
      updateLegMode.mutate({ leg, newMode, fromItem, toItem });
    },
    [itemMap, updateLegMode],
  );

  const handleRouteTypeChange = useCallback(
    (leg: Leg, newRouteType: RouteType) => {
      // For start-location legs, use trip coords as fromItem substitute.
      let fromItem: Item | undefined;
      if (leg.fromItemId === START_LOCATION_ID && trip) {
        // Create a synthetic item for the start location position.
        fromItem = {
          itemId: START_LOCATION_ID,
          dayId: '',
          placeId: '',
          placeName: trip.startName,
          lat: trip.startLat,
          lng: trip.startLng,
          address: trip.startAddress,
          type: 'other',
          scheduledStart: '',
          scheduledEnd: '',
          durationMinutes: 0,
          notesMd: '',
          photoUrls: [],
          availabilityWindows: '[]',
          isOptional: false,
          priority: 0,
          sortOrder: 0,
          destLat: 0,
          destLng: 0,
          destName: '',
          destAddress: '',
          transportMode: trip.defaultMode,
          itemRouteType: 'directions',
          itemRoutePathEncoded: '',
          itemRouteDistanceMeters: 0,
          itemRouteDurationMinutes: 0,
          timelineLocked: false,
          travelFromItemId: '',
          travelToItemId: '',
        };
      } else {
        fromItem = itemMap.get(leg.fromItemId);
      }
      const toItem = itemMap.get(leg.toItemId);
      if (!fromItem || !toItem) return;
      updateLegRouteType.mutate({ leg, newRouteType, fromItem, toItem });
    },
    [itemMap, updateLegRouteType, trip],
  );

  const handleLegClick = useCallback(
    (leg: Leg) => {
      setSelectedLeg(leg);
    },
    [],
  );

  const handleMarkerClick = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      setActiveTab('itinerary');
    },
    [setSelectedItemId, setActiveTab],
  );

  const handleItemRouteClick = useCallback(
    (itemId: string) => {
      setEditingItemId(itemId);
      setExpandedItemId(null);
      const clickedItem = committedItems.find((item) => item.itemId === itemId);
      if (clickedItem && selectedDayId !== null && clickedItem.dayId !== selectedDayId) {
        setSelectedDayId(clickedItem.dayId);
      }
    },
    [committedItems, selectedDayId],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      resetAddItemDraft();
      setMapClickLocation({ lat, lng });
      setShowAddItem(true);
    },
    [resetAddItemDraft],
  );

  const handleAddPlaceToItinerary = useCallback(
    (place: PlaceSearchResult) => {
      resetAddItemDraft();
      setMapSelectedPlace(place);
      setShowAddItem(true);
    },
    [resetAddItemDraft],
  );

  const orderedDays = useMemo(
    () => [...days].sort((a, b) => a.date.localeCompare(b.date)),
    [days],
  );

  const itemAppearanceDayIdsById = useMemo(() => {
    const renderItemsByDay = buildTimelineRenderItemsByDay(orderedDays, renderItems);
    const next = new Map<string, string[]>();

    for (const day of orderedDays) {
      for (const renderItem of renderItemsByDay.get(day.dayId) ?? []) {
        const current = next.get(renderItem.itemId) ?? [];
        if (!current.includes(day.dayId)) {
          current.push(day.dayId);
          next.set(renderItem.itemId, current);
        }
      }
    }

    return next;
  }, [orderedDays, renderItems]);

  const itemDayColorsById = useMemo(() => {
    const dayColorById = new Map(orderedDays.map((day) => [day.dayId, day.colorHex]));
    const next = new Map<string, string[]>();

    for (const item of renderItems) {
      const dayIds = itemAppearanceDayIdsById.get(item.itemId) ?? [];
      const colors = dayIds
        .map((dayId) => dayColorById.get(dayId))
        .filter((color): color is string => Boolean(color));
      next.set(item.itemId, colors);
    }

    return next;
  }, [itemAppearanceDayIdsById, orderedDays, renderItems]);

  const filteredItems = useMemo(
    () => {
      if (!selectedDayId) return renderItems;
      return renderItems.filter((item) =>
        (itemAppearanceDayIdsById.get(item.itemId) ?? [item.dayId]).includes(selectedDayId),
      );
    },
    [itemAppearanceDayIdsById, renderItems, selectedDayId],
  );

  const selectedDayIds = useMemo(
    () => (selectedDayId ? [selectedDayId] : undefined),
    [selectedDayId],
  );

  const mapItems = useMemo(
    () =>
      mapEventFilter === 'committed'
        ? filteredItems.filter((item) => Boolean(item.scheduledStart))
        : filteredItems,
    [filteredItems, mapEventFilter],
  );

  const mapItemIds = useMemo(
    () => new Set(mapItems.map((item) => item.itemId)),
    [mapItems],
  );

  const mapConnectors = useMemo(
    () => deriveTimelineConnectors(mapItems),
    [mapItems],
  );

  const getScheduledItemsForDay = useCallback(
    (dayId: string, excludeItemId?: string) =>
      committedItems
        .filter(
          (item) =>
            item.dayId === dayId &&
            item.itemId !== excludeItemId &&
            Boolean(item.scheduledStart),
        )
        .sort((a, b) => {
          const aStart = a.scheduledStart || '';
          const bStart = b.scheduledStart || '';
          return aStart.localeCompare(bStart);
        }),
    [committedItems],
  );

  const dayDropValidityById = useMemo(() => {
    if (!draggingItemId) return undefined;
    const draggedItem = committedItems.find((item) => item.itemId === draggingItemId);
    if (!draggedItem) return undefined;

    const validity: Record<string, boolean> = {};
    for (const day of days) {
      const dayScheduledItems = getScheduledItemsForDay(day.dayId, draggingItemId);
      const resolution = resolveAppendDropAfterLast({
        item: draggedItem,
        day,
        scheduledItems: dayScheduledItems,
        snapMinutes: timelineSnapMinutes,
      });
      validity[day.dayId] = resolution.valid;
    }

    return validity;
  }, [committedItems, days, draggingItemId, getScheduledItemsForDay, timelineSnapMinutes]);

  useEffect(() => {
    if (!selectedItemId) return;
    const stillVisible = filteredItems.some((item) => item.itemId === selectedItemId);
    if (!stillVisible) {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId, setSelectedItemId]);

  useEffect(() => {
    if (!editingItemId) return;
    const exists = committedItems.some((item) => item.itemId === editingItemId);
    if (!exists) {
      setEditingItemId(null);
    }
  }, [committedItems, editingItemId]);

  useEffect(() => {
    if (!selectedLeg) return;
    const stillVisible =
      mapItemIds.has(selectedLeg.fromItemId) && mapItemIds.has(selectedLeg.toItemId);
    if (!stillVisible) {
      setSelectedLeg(null);
    }
  }, [mapItemIds, selectedLeg]);

  const handleConnectorClick = useCallback(
    (connector: TimelineConnector) => {
      const fromItem = itemMap.get(connector.fromItemId);
      const toItem = itemMap.get(connector.toItemId);
      if (!fromItem || !toItem) return;

      const fromUsesDestination = (fromItem.destLat !== 0 || fromItem.destLng !== 0);
      const origin: PlaceSearchResult = {
        placeId: fromUsesDestination ? `item-dest-${fromItem.itemId}` : fromItem.placeId || `item-origin-${fromItem.itemId}`,
        name: fromUsesDestination ? (fromItem.destName || `${fromItem.placeName} destination`) : fromItem.placeName,
        address: fromUsesDestination ? fromItem.destAddress : fromItem.address,
        lat: fromUsesDestination ? fromItem.destLat : fromItem.lat,
        lng: fromUsesDestination ? fromItem.destLng : fromItem.lng,
        types: [],
      };

      const destination: PlaceSearchResult = {
        placeId: toItem.placeId || `item-origin-${toItem.itemId}`,
        name: toItem.placeName,
        address: toItem.address,
        lat: toItem.lat,
        lng: toItem.lng,
        types: [],
      };

      const defaultMode = trip?.defaultMode ?? 'driving';
      const defaultRouteType: RouteType =
        defaultMode === 'flight' || defaultMode === 'other'
          ? 'straight'
          : 'directions';

      setSelectedDayId(fromItem.dayId);
      resetAddItemDraft();
      setMapSelectedPlace(origin);
      setMapSelectedDestination(destination);
      setAddItemInitialType('transport');
      setAddItemInitialTransportMode(defaultMode);
      setAddItemInitialRouteType(defaultRouteType);
      setAddItemInitialAvailabilityWindows('[]');
      setAddItemInitialTimelineLocked(false);
      setAddItemInitialTravelLink({
        fromItemId: fromItem.itemId,
        toItemId: toItem.itemId,
      });
      setShowAddItem(true);
    },
    [itemMap, resetAddItemDraft, trip],
  );

  // Handler for clicking timeline connector lines - opens travel event dialog
  const handleTimelineConnectorClick = useCallback(
    (connector: TimelineConnectorWithTiming) => {
      const fromItem = itemMap.get(connector.fromItemId);
      const toItem = itemMap.get(connector.toItemId);
      if (!fromItem || !toItem) return;

      const fromUsesDestination = (fromItem.destLat !== 0 || fromItem.destLng !== 0);
      const origin: PlaceSearchResult = {
        placeId: fromUsesDestination ? `item-dest-${fromItem.itemId}` : fromItem.placeId || `item-origin-${fromItem.itemId}`,
        name: fromUsesDestination ? (fromItem.destName || `${fromItem.placeName} destination`) : fromItem.placeName,
        address: fromUsesDestination ? fromItem.destAddress : fromItem.address,
        lat: fromUsesDestination ? fromItem.destLat : fromItem.lat,
        lng: fromUsesDestination ? fromItem.destLng : fromItem.lng,
        types: [],
      };

      const destination: PlaceSearchResult = {
        placeId: toItem.placeId || `item-origin-${toItem.itemId}`,
        name: toItem.placeName,
        address: toItem.address,
        lat: toItem.lat,
        lng: toItem.lng,
        types: [],
      };

      const defaultMode = trip?.defaultMode ?? 'driving';
      const defaultRouteType: RouteType =
        defaultMode === 'flight' || defaultMode === 'other'
          ? 'straight'
          : 'directions';

      // Use the gap timing from the connector for the travel event
      const startTime = minutesToTime(connector.fromEndMin);
      const endTime = minutesToTime(connector.toStartMin);

      setSelectedDayId(fromItem.dayId);
      resetAddItemDraft();
      setMapSelectedPlace(origin);
      setMapSelectedDestination(destination);
      setAddItemInitialType('transport');
      setAddItemInitialTransportMode(defaultMode);
      setAddItemInitialRouteType(defaultRouteType);
      setAddItemInitialAvailabilityWindows('[]');
      setAddItemInitialTimelineLocked(false);
      setAddItemInitialTravelLink({
        fromItemId: fromItem.itemId,
        toItemId: toItem.itemId,
      });
      // Set the scheduled time to fill the gap between items
      setAddItemInitialTimes({ start: startTime, end: endTime });
      setShowAddItem(true);
    },
    [itemMap, resetAddItemDraft, trip],
  );

  // Handler for removing a timeline connector (suppressing it)
  const handleTimelineConnectorRemove = useCallback(
    (connector: TimelineConnectorWithTiming) => {
      setSuppressedConnectorIds((prev) => {
        const next = new Set(prev);
        next.add(connector.id);
        return next;
      });
    },
    [],
  );

  const handleAddDay = () => {
    setEditingDay(undefined);
    const lastOrderedDay = orderedDays[orderedDays.length - 1];
    const baseDate = lastOrderedDay?.date ?? trip?.startDate ?? '';
    const nextDate = baseDate
      ? format(addDays(parseISO(baseDate), orderedDays.length > 0 ? 1 : 0), 'yyyy-MM-dd')
      : '';
    setNewDayDefaultDate(nextDate);
    setNewDayDefaultLabel(getAutoDayLabel(nextDate));
    setShowDayEditor(true);
  };

  const handleDeleteSelectedDay = useCallback((dayId: string) => {
    if (deleteDay.isPending) return;

    const day = days.find((d) => d.dayId === dayId);
    if (!day) return;

    const eventCount = committedItems.filter((item) => item.dayId === dayId).length;
    setPendingDayDelete({
      dayId,
      label: getDayDisplayLabel(day),
      eventCount,
    });
  }, [committedItems, days, deleteDay.isPending]);

  const handleConfirmDeleteDay = useCallback(() => {
    if (!pendingDayDelete || deleteDay.isPending) return;
    const dayId = pendingDayDelete.dayId;
    if (selectedDayId === dayId) {
      setSelectedDayId(null);
    }
    deleteDay.mutate(dayId, {
      onSettled: () => {
        setPendingDayDelete(null);
      },
    });
  }, [deleteDay, pendingDayDelete, selectedDayId]);

  const handleSaveDay = (dayData: Partial<Day> & { dayId: string }) => {
    if (editingDay) {
      updateDay.mutate(dayData as Day);
    } else {
      addDay.mutate({
        dayId: dayData.dayId,
        date: dayData.date ?? '',
        label: dayData.label ?? '',
        colorHex: dayData.colorHex ?? '#3B82F6',
        dayStart: dayData.dayStart ?? '08:00',
        dayEnd: dayData.dayEnd ?? '22:00',
      });
    }
  };

  const handleAddItem = useCallback(
    (data: {
      placeId: string;
      placeName: string;
      lat: number;
      lng: number;
      address: string;
      type: Item['type'];
      durationMinutes: number;
      notesMd: string;
      scheduledStart: string;
      scheduledEnd: string;
      destLat: number;
      destLng: number;
      destName: string;
      destAddress: string;
      transportMode?: TransportMode;
      itemRouteType?: RouteType;
      itemRoutePathEncoded?: string;
      itemRouteDistanceMeters?: number;
      itemRouteDurationMinutes?: number;
      availabilityWindows?: string;
      timelineLocked?: boolean;
      travelFromItemId?: string;
      travelToItemId?: string;
    }) => {
      const targetDayId = selectedDayId ?? days[0]?.dayId ?? '';
      // Calculate sortOrder based on items in the same day, not globally
      const itemsInDay = committedItems.filter((i) => i.dayId === targetDayId);
      addItem.mutate({
        itemId: crypto.randomUUID(),
        dayId: targetDayId,
        placeId: data.placeId,
        placeName: data.placeName,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        type: data.type,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        durationMinutes: data.durationMinutes,
        notesMd: data.notesMd,
        photoUrls: [],
        availabilityWindows: data.availabilityWindows ?? '[]',
        isOptional: false,
        priority: 0,
        sortOrder: itemsInDay.length,
        destLat: data.destLat,
        destLng: data.destLng,
        destName: data.destName,
        destAddress: data.destAddress,
        transportMode: data.transportMode ?? (trip?.defaultMode ?? 'driving'),
        itemRouteType: data.itemRouteType ?? (
          (data.transportMode ?? (trip?.defaultMode ?? 'driving')) === 'flight' ||
          (data.transportMode ?? (trip?.defaultMode ?? 'driving')) === 'other'
            ? 'straight'
            : 'directions'
        ),
        itemRoutePathEncoded: data.itemRoutePathEncoded ?? '',
        itemRouteDistanceMeters: data.itemRouteDistanceMeters ?? 0,
        itemRouteDurationMinutes: data.itemRouteDurationMinutes ?? 0,
        timelineLocked: data.timelineLocked ?? false,
        travelFromItemId: data.travelFromItemId ?? '',
        travelToItemId: data.travelToItemId ?? '',
      });
      closeAddItemDialog();
    },
    [addItem, closeAddItemDialog, selectedDayId, days, committedItems, trip],
  );

  const mergeItemUpdates = useCallback((existing: Item, updates: Partial<Item>): Item => {
    const merged: Item = { ...existing, ...updates };
    const routeRelevantKeys: (keyof Item)[] = [
      'lat',
      'lng',
      'destLat',
      'destLng',
      'transportMode',
      'itemRouteType',
    ];
    const shouldResetRoute = routeRelevantKeys.some(
      (key) => key in updates && updates[key] !== existing[key],
    );
    if (shouldResetRoute) {
      merged.itemRoutePathEncoded = '';
      merged.itemRouteDistanceMeters = 0;
      merged.itemRouteDurationMinutes = 0;
    }
    return merged;
  }, []);

  const editingItem = useMemo(
    () =>
      editingItemId
        ? committedItems.find((item) => item.itemId === editingItemId) ?? null
        : null,
    [committedItems, editingItemId],
  );
  const editingItemDayColor = useMemo(() => {
    if (!editingItem) return null;
    const appearanceDayIds = itemAppearanceDayIdsById.get(editingItem.itemId) ?? [];
    const dayId =
      selectedDayId && appearanceDayIds.includes(selectedDayId)
        ? selectedDayId
        : appearanceDayIds[0];
    return dayId ? days.find((day) => day.dayId === dayId) ?? null : null;
  }, [days, editingItem, itemAppearanceDayIdsById, selectedDayId]);

  const editingItemDayDate = useMemo(() => {
    if (!editingItem) return null;
    const dayId = selectedDayId ?? editingItem.dayId;
    return dayId ? days.find((day) => day.dayId === dayId) ?? null : null;
  }, [days, editingItem, selectedDayId]);

  // Handler for moving an item to a different day via drag-drop on tabs
  const handleMoveItemToDay = useCallback(
    (dayId: string, itemId: string) => {
      const day = days.find((d) => d.dayId === dayId);
      const item = committedItems.find((i) => i.itemId === itemId);
      if (!day || !item) return;
      if (item.timelineLocked) return;

      const dayScheduledItems = getScheduledItemsForDay(dayId, item.itemId);

      const resolution = resolveAppendDropAfterLast({
        item,
        day,
        scheduledItems: dayScheduledItems,
        snapMinutes: timelineSnapMinutes,
      });
      if (!resolution.valid) return;

      // Append position should become the last item in the target day list.
      const targetDayItems = committedItems.filter(
        (candidate) => candidate.dayId === dayId && candidate.itemId !== item.itemId,
      );

      updateItem.mutate({
        ...item,
        dayId,
        scheduledStart: minutesToTime(resolution.startMin),
        scheduledEnd: minutesToTime(resolution.endMin),
        durationMinutes: resolution.durationMinutes,
        sortOrder: targetDayItems.length,
      });
    },
    [committedItems, days, getScheduledItemsForDay, timelineSnapMinutes, updateItem],
  );

  const activeCollaborators = useMemo(
    () =>
      tripCursors
        .filter((cursor) => cursor.connectionId !== localConnectionId)
        .map((cursor) => ({
          connectionId: cursor.connectionId,
          userId: cursor.userId,
          name: cursor.name,
          picture: cursor.picture,
          color: cursor.color,
        })),
    [localConnectionId, tripCursors],
  );
  const handleLiveItemPreviewChange = useCallback(
    (
      preview:
        | {
            itemId: string;
            dayId: string;
            scheduledStart: string;
            scheduledEnd: string;
            durationMinutes: number;
          }
        | null,
    ) => {
      sendItemPreview(tripId, preview);
    },
    [sendItemPreview, tripId],
  );
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }
      setExpandedItemId((current) => (current === itemId ? null : current));
      setEditingItemId((current) => (current === itemId ? null : current));
      deleteItem.mutate(itemId);
    },
    [deleteItem, selectedItemId, setSelectedItemId],
  );
  const handleDayTabItemPreviewChange = useCallback(
    (preview: { dayId: string; itemId: string } | null) => {
      if (!preview) {
        clearLiveItemPreview();
        return;
      }

      const day = days.find((entry) => entry.dayId === preview.dayId);
      const item = committedItems.find((entry) => entry.itemId === preview.itemId);
      if (!day || !item || item.timelineLocked) {
        clearLiveItemPreview();
        return;
      }

      const dayScheduledItems = getScheduledItemsForDay(preview.dayId, preview.itemId);
      const resolution = resolveAppendDropAfterLast({
        item,
        day,
        scheduledItems: dayScheduledItems,
        snapMinutes: timelineSnapMinutes,
      });
      if (!resolution.valid) {
        clearLiveItemPreview();
        return;
      }

      sendItemPreview(tripId, {
        itemId: preview.itemId,
        dayId: preview.dayId,
        scheduledStart: minutesToTime(resolution.startMin),
        scheduledEnd: minutesToTime(resolution.endMin),
        durationMinutes: resolution.durationMinutes,
      });
    },
    [clearLiveItemPreview, committedItems, days, getScheduledItemsForDay, sendItemPreview, timelineSnapMinutes, tripId],
  );
  const canManageSharing = useMemo(
    () => members.some((member) => member.userId === user?.id && member.role === 'owner'),
    [members, user?.id],
  );
  const syncStatus = isFetching
    ? 'syncing'
    : connectionState === 'disconnected'
      ? 'offline'
      : 'synced';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-theme bg-theme-elevated p-6 text-center shadow-theme-sm">
          <h1 className="text-xl font-semibold text-theme">
            {status === 403 ? 'Trip Access Denied' : 'Unable to Load Trip'}
          </h1>
          <p className="text-sm text-theme-secondary">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell
        workspaceRef={workspaceRef}
        tripName={trip?.name}
        timelineDayCount={days.length}
        syncStatus={syncStatus}
        user={user ? { name: user.name, picture: user.picture } : undefined}
        onLogout={() => void logout()}
        shareControl={
          trip && user ? (
            <TripShareMenu
              canManage={canManageSharing}
              members={members}
              pendingInvites={pendingInvites}
              currentUserId={user.id}
              onInvite={async (payload) => {
                await createInvite.mutateAsync(payload);
              }}
              onDeleteInvite={async (inviteId) => {
                await deleteInvite.mutateAsync(inviteId);
              }}
              onDeleteMember={async (member) => {
                await deleteMember.mutateAsync(member);
              }}
              isInviting={createInvite.isPending}
            />
          ) : null
        }
        activeCollaborators={activeCollaborators}
        workspaceOverlay={
          isDesktopPresenceEnabled ? (
            <CursorPresenceOverlay
              cursors={tripCursors}
              currentConnectionId={localConnectionId}
            />
          ) : null
        }
        topBanner={
          remoteEditNotice ? (
            <ConflictBanner
              message={remoteEditNotice}
              onDismiss={() => dismissRemoteEditNotice(tripId)}
            />
          ) : null
        }
        dayTabs={
          <DayTabs
            days={days}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            onAddDay={handleAddDay}
            onDeleteSelectedDay={handleDeleteSelectedDay}
            onDropItem={handleMoveItemToDay}
            onItemDragPreviewChange={handleDayTabItemPreviewChange}
            draggingItemId={draggingItemId}
            dropValidityByDay={dayDropValidityById}
          />
        }
        itinerary={
          <ItineraryList
            items={filteredItems}
            days={days}
            itemDayColorsById={itemDayColorsById}
            trip={trip}
            selectedDayId={selectedDayId}
            selectedItemId={selectedItemId}
            expandedItemId={expandedItemId}
            onExpandedItemChange={setExpandedItemId}
            onReorder={(ids) => {
              const dayId = selectedDayId ?? days[0]?.dayId ?? '';
              const orderedItemIds = selectedDayId
                ? ids.filter((id) => committedItems.find((i) => i.itemId === id)?.dayId === selectedDayId)
                : ids;
              reorderItems.mutate({ dayId, orderedItemIds });
            }}
            onUpdateItem={(id, updates) => {
              const existing = committedItems.find((i) => i.itemId === id);
              if (existing) updateItem.mutate(mergeItemUpdates(existing, updates));
            }}
            onDeleteItem={handleDeleteItem}
            onAddItem={() => {
              resetAddItemDraft();
              setShowAddItem(true);
            }}
            onItemClick={(id) => {
              setSelectedItemId(id);
              setActiveTab('itinerary');
            }}
            onUpdateTrip={handleUpdateTrip}
            onExternalDragStart={handleExternalDragStart}
            onExternalDragEnd={handleExternalDragEnd}
          />
        }
        timeline={
          <VerticalTimeline
            items={renderItems}
            days={days}
            selectedDayIds={selectedDayIds ?? []}
            selectedItemId={selectedItemId}
            activeDragItemId={draggingItemId}
            snapMinutes={timelineSnapMinutes}
            onSnapMinutesChange={setTimelineSnapMinutes}
            onDragOverTimeline={setIsDragOverTimeline}
            onUpdateItem={(id, updates) => {
              const existing = committedItems.find((i) => i.itemId === id);
              if (existing) updateItem.mutate(mergeItemUpdates(existing, updates));
            }}
            onLiveItemPreviewChange={handleLiveItemPreviewChange}
            onItemClick={(id) => {
              setSelectedItemId(id);
              const clickedItem = committedItems.find((item) => item.itemId === id);
              if (clickedItem && selectedDayId !== null && clickedItem.dayId !== selectedDayId) {
                setSelectedDayId(clickedItem.dayId);
              }
            }}
            onItemDoubleClick={(id) => {
              setSelectedItemId(id);
              setExpandedItemId(id);
              setActiveTab('itinerary');
              const clickedItem = committedItems.find((item) => item.itemId === id);
              if (clickedItem && selectedDayId !== null && clickedItem.dayId !== selectedDayId) {
                setSelectedDayId(clickedItem.dayId);
              }
            }}
            onCreateAtTime={(dayId, startTime, endTime) => {
              setSelectedDayId(dayId);
              resetAddItemDraft();
              setAddItemInitialTimes({ start: startTime, end: endTime });
              setShowAddItem(true);
            }}
            onTimelineConnectorClick={handleTimelineConnectorClick}
            onTimelineConnectorRemove={handleTimelineConnectorRemove}
            suppressedConnectorIds={suppressedConnectorIds}
            showTimelineConnectors={showTimelineConnectors}
            onToggleTimelineConnectors={() => setShowTimelineConnectors((prev) => !prev)}
          />
        }
        map={
          <div className="relative h-full">
            <MapShell
              items={mapItems}
              legs={ENABLE_LEGACY_LEGS ? legs : []}
              days={days}
              trip={trip}
              selectedDayIds={selectedDayIds}
              selectedItemId={selectedItemId}
              onSelectedItemChange={setSelectedItemId}
              onMarkerClick={handleMarkerClick}
              onItemRouteClick={handleItemRouteClick}
              onLegClick={ENABLE_LEGACY_LEGS ? handleLegClick : undefined}
              onModeChange={ENABLE_LEGACY_LEGS ? handleModeChange : undefined}
              onMapClick={handleMapClick}
              onAddPlaceToItinerary={handleAddPlaceToItinerary}
              onEditItem={(itemId) => {
                setEditingItemId(itemId);
                setSelectedItemId(itemId);
              }}
              onDeleteItem={handleDeleteItem}
              connectors={mapConnectors}
              onConnectorClick={handleConnectorClick}
              showLegacyLegs={ENABLE_LEGACY_LEGS}
            />

            <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
              <div className="pointer-events-auto inline-flex rounded-lg border border-theme bg-theme-elevated p-1 shadow-theme-md">
                <button
                  type="button"
                  onClick={() => setMapEventFilter('all')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    mapEventFilter === 'all'
                      ? 'bg-theme text-theme'
                      : 'text-theme-secondary hover:bg-theme-subtle hover:text-theme'
                  }`}
                >
                  All events
                </button>
                <button
                  type="button"
                  onClick={() => setMapEventFilter('committed')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    mapEventFilter === 'committed'
                      ? 'bg-theme text-theme'
                      : 'text-theme-secondary hover:bg-theme-subtle hover:text-theme'
                  }`}
                >
                  Committed
                </button>
              </div>
            </div>
          </div>
        }
      />

      <DayEditor
        day={editingDay}
        isOpen={showDayEditor}
        defaultLabel={newDayDefaultLabel}
        defaultDate={newDayDefaultDate}
        onClose={() => setShowDayEditor(false)}
        onSave={handleSaveDay}
      />

      <DeleteDayDialog
        isOpen={Boolean(pendingDayDelete)}
        dayLabel={pendingDayDelete?.label ?? ''}
        eventCount={pendingDayDelete?.eventCount ?? 0}
        isDeleting={deleteDay.isPending}
        onCancel={() => {
          if (deleteDay.isPending) return;
          setPendingDayDelete(null);
        }}
        onConfirm={handleConfirmDeleteDay}
      />

      <AddItemDialog
        isOpen={showAddItem}
        onClose={closeAddItemDialog}
        onAdd={handleAddItem}
        isSubmitting={addItem.isPending}
        initialPlace={mapSelectedPlace}
        initialDestination={mapSelectedDestination}
        initialLocation={mapClickLocation}
        initialStartTime={addItemInitialTimes?.start}
        initialEndTime={addItemInitialTimes?.end}
        initialType={addItemInitialType}
        initialTransportMode={addItemInitialTransportMode}
        initialRouteType={addItemInitialRouteType}
        initialAvailabilityWindows={addItemInitialAvailabilityWindows}
        initialTimelineLocked={addItemInitialTimelineLocked}
        initialTravelFromItemId={addItemInitialTravelLink?.fromItemId}
        initialTravelToItemId={addItemInitialTravelLink?.toItemId}
        defaultDate={(days.find((d) => d.dayId === (selectedDayId ?? days[0]?.dayId)) ?? days[0])?.date}
      />

      <ItemEditorDialog
        isOpen={Boolean(editingItem)}
        item={editingItem}
        dayColor={editingItemDayColor?.colorHex}
        dayDate={editingItemDayDate?.date}
        onUpdate={(updates) => {
          if (!editingItem) return;
          updateItem.mutate(mergeItemUpdates(editingItem, updates));
        }}
        onDelete={() => {
          if (!editingItem) return;
          handleDeleteItem(editingItem.itemId);
        }}
        onClose={() => setEditingItemId(null)}
      />

      {selectedLeg && (() => {
        let fromItem: Item | undefined;
        if (selectedLeg.fromItemId === START_LOCATION_ID && trip) {
          fromItem = {
            itemId: START_LOCATION_ID,
            dayId: '',
            placeId: '',
            placeName: trip.startName || 'Start',
            lat: trip.startLat,
            lng: trip.startLng,
            address: trip.startAddress,
            type: 'other',
            scheduledStart: '',
            scheduledEnd: '',
            durationMinutes: 0,
            notesMd: '',
            photoUrls: [],
            availabilityWindows: '[]',
            isOptional: false,
            priority: 0,
            sortOrder: 0,
            destLat: 0,
            destLng: 0,
            destName: '',
            destAddress: '',
            transportMode: trip.defaultMode,
            itemRouteType: 'directions',
            itemRoutePathEncoded: '',
            itemRouteDistanceMeters: 0,
            itemRouteDurationMinutes: 0,
            timelineLocked: false,
            travelFromItemId: '',
            travelToItemId: '',
          };
        } else {
          fromItem = itemMap.get(selectedLeg.fromItemId);
        }
        const toItem = itemMap.get(selectedLeg.toItemId);
        if (!fromItem || !toItem) return null;
        return (
          <LegInfoPopup
            leg={selectedLeg}
            fromItem={fromItem}
            toItem={toItem}
            onClose={() => setSelectedLeg(null)}
            onModeChange={(mode) => {
              handleModeChange(selectedLeg, mode);
              setSelectedLeg(null);
            }}
            onRouteTypeChange={(routeType) => {
              handleRouteTypeChange(selectedLeg, routeType);
              setSelectedLeg(null);
            }}
          />
        );
      })()}

      <DragOverlay
        item={draggingItemId ? committedItems.find((i) => i.itemId === draggingItemId) ?? null : null}
        dayColor={
          draggingItemId
            ? days.find((d) => d.dayId === committedItems.find((i) => i.itemId === draggingItemId)?.dayId)?.colorHex
            : undefined
        }
        isOverTimeline={isDragOverTimeline}
      />
    </>
  );
}

function TripDashboard() {
  const navigate = useNavigate();
  const tripsQuery = useQuery<TripListItem[], Error>({
    queryKey: ['trips'],
    queryFn: listTrips,
  });

  const handleCreateTrip = useCallback(async (name: string, startDate: string, endDate: string, timezone: string) => {
    const created = await createTrip({ name, startDate, endDate, timezone });
    navigate(`/trip/${created.id}`);
  }, [navigate]);

  const handleOpenTrip = useCallback((tripId: string) => {
    navigate(`/trip/${tripId}`);
  }, [navigate]);

  return (
    <TripSetup
      onCreateTrip={handleCreateTrip}
      onOpenTrip={handleOpenTrip}
      trips={tripsQuery.data ?? []}
      isLoadingTrips={tripsQuery.isLoading}
      tripsError={tripsQuery.error?.message ?? null}
    />
  );
}

function TripRoute() {
  const { tripId } = useParams<{ tripId: string }>();
  if (!tripId) {
    return null;
  }

  return <TripApp tripId={tripId} />;
}

function RootLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <TripDashboard /> },
      { path: 'trip/:tripId', element: <TripRoute /> },
    ],
  },
]);
