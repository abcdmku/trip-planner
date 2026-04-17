import { createHashRouter, Outlet, useParams, useNavigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './hooks/useAuth';
import { useTrip } from './hooks/useTrip';
import { useUI } from './hooks/useUI';
import { CreateTripDialog } from './components/sheets/CreateTripDialog';
import { SchemaStatus } from './components/sheets/SchemaStatus';
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
import { validateSchema, initializeSheet } from './lib/schema';
import { createSpreadsheet } from './lib/google-api';
import { openSheetPicker } from './lib/google-picker';
import { useAddDay, useDeleteDay, useUpdateDay } from './hooks/useDays';
import { useAddItem, useUpdateItem, useDeleteItem, useReorderItems } from './hooks/useItems';
import { useLegs, useUpdateLegMode, useUpdateLegRouteType, useRecalculateLegs } from './hooks/useLegs';
import { useUpdateTrip } from './hooks/useTrip';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useUndoRedoHotkeys } from './hooks/useUndoRedoHotkeys';
import { START_LOCATION_ID } from './services/leg-recompute';
import { overwriteTripCoreTabs } from './services/trip-core-writer';
import { saveDays } from './services/sheets-repository';
import { getMostRecentLocalSnapshot, readUndoHistory } from './stores/undo-store';
import type { PlaceSearchResult } from './services/maps-repository';
import { deriveTimelineConnectors, type TimelineConnector, type TimelineConnectorWithTiming } from './lib/connectors';
import { getDayColor } from './lib/day-colors';
import { resolveAppendDropAfterLast, minutesToTime } from './lib/timeline-drop';
import { Plane, FolderOpen, Loader2 } from 'lucide-react';
import type { Day, Item, Leg, Trip, TransportMode, RouteType } from './types/trip';
import LegInfoPopup from './components/map/LegInfoPopup';
import { DragOverlay } from './components/items/DragOverlay';
import { discoverLoadableTrips, type LoadableTripSummary } from './services/drive-repository';

function formatModifiedTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function TripSetup({
  onCreateTrip,
  onImportSheet,
  onOpenKnownTrip,
  schemaStatus,
  schemaErrors,
  isGapiReady,
  loadableTrips,
  isLoadingLoadableTrips,
  loadableTripsError,
}: {
  onCreateTrip: (name: string, startDate: string, endDate: string, timezone: string) => void;
  onImportSheet: () => void;
  onOpenKnownTrip: (spreadsheetId: string) => void;
  schemaStatus: 'validating' | 'valid' | 'invalid' | 'initializing' | 'creating' | null;
  schemaErrors: string[];
  isGapiReady: boolean;
  loadableTrips: LoadableTripSummary[];
  isLoadingLoadableTrips: boolean;
  loadableTripsError: string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const isLoading = !isGapiReady || schemaStatus === 'validating' || schemaStatus === 'creating' || schemaStatus === 'initializing';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-theme">Trip Planner</h1>
          <p className="mt-2 text-sm text-theme-secondary">
            {!isGapiReady ? 'Connecting to Google...' : 'Create a new trip or open an existing one'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowCreate(true)}
            disabled={isLoading}
            className="btn-primary flex w-full items-center justify-center gap-3 px-4 py-4 text-sm font-semibold"
          >
            {schemaStatus === 'creating' || schemaStatus === 'initializing' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating trip...
              </>
            ) : (
              <>
                <Plane className="h-5 w-5" />
                Create New Trip
              </>
            )}
          </button>

          <button
            onClick={onImportSheet}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-theme bg-theme-elevated px-4 py-4 text-sm font-semibold text-theme shadow-theme-sm transition-all hover:bg-theme-subtle disabled:opacity-40"
          >
            {schemaStatus === 'validating' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FolderOpen className="h-5 w-5" />
                Open Existing Trip
              </>
            )}
          </button>
        </div>

        {schemaStatus && schemaStatus !== 'creating' && (
          <SchemaStatus status={schemaStatus} errors={schemaErrors} />
        )}

        {isGapiReady && (
          <div className="rounded-2xl border border-theme bg-theme-elevated p-3 shadow-theme-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-theme">
                Loadable Trips ({loadableTrips.length})
              </h2>
              {isLoadingLoadableTrips && <Loader2 className="h-4 w-4 animate-spin text-theme-secondary" />}
            </div>

            {loadableTripsError ? (
              <p className="text-xs text-theme-secondary">{loadableTripsError}</p>
            ) : isLoadingLoadableTrips && loadableTrips.length === 0 ? (
              <p className="text-xs text-theme-secondary">Scanning accessible spreadsheets...</p>
            ) : loadableTrips.length === 0 ? (
              <p className="text-xs text-theme-secondary">
                No Trip Planner sheets found yet. Create one or use the picker to grant access.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {loadableTrips.map((trip) => {
                  const modifiedLabel = formatModifiedTime(trip.modifiedTime);
                  return (
                    <button
                      key={trip.spreadsheetId}
                      type="button"
                      onClick={() => onOpenKnownTrip(trip.spreadsheetId)}
                      className="w-full rounded-xl border border-theme bg-theme px-3 py-2 text-left shadow-theme-sm transition-colors hover:bg-theme-subtle"
                    >
                      <div className="truncate text-sm font-medium text-theme">{trip.name}</div>
                      <div className="mt-1 truncate text-[11px] text-theme-secondary">{trip.spreadsheetId}</div>
                      {modifiedLabel && (
                        <div className="mt-1 text-[11px] text-theme-secondary">Updated {modifiedLabel}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
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

function TripApp({ spreadsheetId }: { spreadsheetId: string }) {
  const ENABLE_LEGACY_LEGS = false;
  const { user, logout } = useAuth();
  const { setActiveTab, selectedItemId, setSelectedItemId } = useUI();
  const { trip, days, items, data: tripData, isLoading, isFetching } = useTrip(spreadsheetId);
  const { legs } = useLegs(spreadsheetId);
  const { ensureSynced } = useUndoRedo(spreadsheetId);

  useUndoRedoHotkeys(spreadsheetId);

  const hasSyncedUndoRef = useRef(false);
  const wasFetchingUndoRef = useRef(false);

  useEffect(() => {
    hasSyncedUndoRef.current = false;
    wasFetchingUndoRef.current = false;
  }, [spreadsheetId]);

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
  const [suppressedConnectorIds, setSuppressedConnectorIds] = useState<Set<string>>(new Set());
  const [showTimelineConnectors, setShowTimelineConnectors] = useState(true);
  const dragClearTimerRef = useRef<number | null>(null);

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

  const scheduleDragCleanup = useCallback((defer: boolean) => {
    if (dragClearTimerRef.current !== null) {
      window.clearTimeout(dragClearTimerRef.current);
      dragClearTimerRef.current = null;
    }

    if (!defer) {
      setDraggingItemId(null);
      setIsDragOverTimeline(false);
      return;
    }

    dragClearTimerRef.current = window.setTimeout(() => {
      dragClearTimerRef.current = null;
      setDraggingItemId(null);
      setIsDragOverTimeline(false);
    }, 0);
  }, []);

  const handleExternalDragStart = useCallback((itemId: string) => {
    if (dragClearTimerRef.current !== null) {
      window.clearTimeout(dragClearTimerRef.current);
      dragClearTimerRef.current = null;
    }
    setDraggingItemId(itemId);
  }, []);

  const handleExternalDragEnd = useCallback(() => {
    scheduleDragCleanup(true);
  }, [scheduleDragCleanup]);

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

  const addDay = useAddDay(spreadsheetId);
  const updateDay = useUpdateDay(spreadsheetId);
  const deleteDay = useDeleteDay(spreadsheetId);
  const addItem = useAddItem(spreadsheetId);
  const updateItem = useUpdateItem(spreadsheetId);
  const deleteItem = useDeleteItem(spreadsheetId);
  const reorderItems = useReorderItems(spreadsheetId);
  const updateTrip = useUpdateTrip(spreadsheetId);
  const updateLegMode = useUpdateLegMode(spreadsheetId);
  const updateLegRouteType = useUpdateLegRouteType(spreadsheetId);
  const recalculateLegs = useRecalculateLegs(spreadsheetId);

  // Build item lookup for leg info popup
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.itemId, item])),
    [items],
  );

  // Auto-calculate legs when items exist but no legs cover them.
  // Uses a stable fingerprint to avoid re-running on every render.
  const itemFingerprint = useMemo(
    () => items.map((i) => `${i.itemId}:${i.sortOrder}:${i.dayId}`).join(','),
    [items],
  );

  useEffect(() => {
    if (!ENABLE_LEGACY_LEGS) return;
    if (items.length < 2 || recalculateLegs.isPending) return;

    // Check if existing legs already cover the current item pairs.
    const legKeys = new Set(legs.map((l) => `${l.fromItemId}::${l.toItemId}`));
    const dayGroups = new Map<string, Item[]>();
    for (const item of items) {
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
  }, [ENABLE_LEGACY_LEGS, itemFingerprint, legs.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const clickedItem = items.find((item) => item.itemId === itemId);
      if (clickedItem && selectedDayId !== null && clickedItem.dayId !== selectedDayId) {
        setSelectedDayId(clickedItem.dayId);
      }
    },
    [items, selectedDayId],
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
    const renderItemsByDay = buildTimelineRenderItemsByDay(orderedDays, items);
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
  }, [items, orderedDays]);

  const itemDayColorsById = useMemo(() => {
    const dayColorById = new Map(orderedDays.map((day) => [day.dayId, day.colorHex]));
    const next = new Map<string, string[]>();

    for (const item of items) {
      const dayIds = itemAppearanceDayIdsById.get(item.itemId) ?? [];
      const colors = dayIds
        .map((dayId) => dayColorById.get(dayId))
        .filter((color): color is string => Boolean(color));
      next.set(item.itemId, colors);
    }

    return next;
  }, [itemAppearanceDayIdsById, items, orderedDays]);

  const filteredItems = useMemo(
    () => {
      if (!selectedDayId) return items;
      return items.filter((item) => (itemAppearanceDayIdsById.get(item.itemId) ?? [item.dayId]).includes(selectedDayId));
    },
    [itemAppearanceDayIdsById, items, selectedDayId],
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
      items
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
    [items],
  );

  const dayDropValidityById = useMemo(() => {
    if (!draggingItemId) return undefined;
    const draggedItem = items.find((item) => item.itemId === draggingItemId);
    if (!draggedItem) return undefined;

    const validity: Record<string, boolean> = {};
    for (const day of days) {
      const dayScheduledItems = getScheduledItemsForDay(day.dayId, draggingItemId);
      const resolution = resolveAppendDropAfterLast({
        item: draggedItem,
        day,
        scheduledItems: dayScheduledItems,
      });
      validity[day.dayId] = resolution.valid;
    }

    return validity;
  }, [days, draggingItemId, getScheduledItemsForDay, items]);

  useEffect(() => {
    if (!selectedItemId) return;
    const stillVisible = filteredItems.some((item) => item.itemId === selectedItemId);
    if (!stillVisible) {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId, setSelectedItemId]);

  useEffect(() => {
    if (!editingItemId) return;
    const exists = items.some((item) => item.itemId === editingItemId);
    if (!exists) {
      setEditingItemId(null);
    }
  }, [editingItemId, items]);

  // Delete key removes item from timeline (unschedules) but keeps it in the event list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' || !selectedItemId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const item = items.find((i) => i.itemId === selectedItemId);
      if (!item || !item.scheduledStart || item.timelineLocked) return;

      e.preventDefault();
      updateItem.mutate({ ...item, scheduledStart: '', scheduledEnd: '' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, items, updateItem]);

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
    const maxDayNumber = days.reduce((max, day) => {
      const match = day.label.match(/^day\s+(\d+)\b/i);
      if (!match) return max;
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);
    const nextNumber = Math.max(days.length, maxDayNumber) + 1;
    setNewDayDefaultLabel(`Day ${nextNumber}`);
    setShowDayEditor(true);
  };

  const handleDeleteSelectedDay = useCallback((dayId: string) => {
    if (deleteDay.isPending) return;

    const day = days.find((d) => d.dayId === dayId);
    if (!day) return;

    const eventCount = items.filter((item) => item.dayId === dayId).length;
    setPendingDayDelete({
      dayId,
      label: day.label,
      eventCount,
    });
  }, [days, deleteDay.isPending, items]);

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
      const itemsInDay = items.filter((i) => i.dayId === targetDayId);
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
    [addItem, closeAddItemDialog, selectedDayId, days, items, trip],
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
      'scheduledStart',
      'scheduledEnd',
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
    () => (editingItemId ? items.find((item) => item.itemId === editingItemId) ?? null : null),
    [editingItemId, items],
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
      const item = items.find((i) => i.itemId === itemId);
      if (!day || !item) return;
      if (item.timelineLocked) return;

      const dayScheduledItems = getScheduledItemsForDay(dayId, item.itemId);

      const resolution = resolveAppendDropAfterLast({
        item,
        day,
        scheduledItems: dayScheduledItems,
      });
      if (!resolution.valid) return;

      // Append position should become the last item in the target day list.
      const targetDayItems = items.filter(
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
    [days, getScheduledItemsForDay, items, updateItem],
  );

  return (
    <>
      <AppShell
        tripName={trip?.name}
        timelineDayCount={days.length}
        syncStatus={isLoading ? 'syncing' : 'synced'}
        user={user ? { name: user.name, picture: user.picture } : undefined}
        onLogout={logout}
        dayTabs={
          <DayTabs
            days={days}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            onAddDay={handleAddDay}
            onDeleteSelectedDay={handleDeleteSelectedDay}
            onDropItem={handleMoveItemToDay}
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
                ? ids.filter((id) => items.find((i) => i.itemId === id)?.dayId === selectedDayId)
                : ids;
              reorderItems.mutate({ dayId, orderedItemIds });
            }}
            onUpdateItem={(id, updates) => {
              const existing = items.find((i) => i.itemId === id);
              if (existing) updateItem.mutate(mergeItemUpdates(existing, updates));
            }}
            onDeleteItem={(id) => {
              if (selectedItemId === id) setSelectedItemId(null);
              deleteItem.mutate(id);
            }}
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
            items={items}
            days={days}
            selectedDayIds={selectedDayIds ?? []}
            selectedItemId={selectedItemId}
            activeDragItemId={draggingItemId}
            onDragOverTimeline={setIsDragOverTimeline}
            onUpdateItem={(id, updates) => {
              const existing = items.find((i) => i.itemId === id);
              if (existing) updateItem.mutate(mergeItemUpdates(existing, updates));
            }}
            onItemClick={(id) => {
              setSelectedItemId(id);
              const clickedItem = items.find((item) => item.itemId === id);
              if (clickedItem && selectedDayId !== null && clickedItem.dayId !== selectedDayId) {
                setSelectedDayId(clickedItem.dayId);
              }
            }}
            onItemDoubleClick={(id) => {
              setSelectedItemId(id);
              setExpandedItemId(id);
              setActiveTab('itinerary');
              const clickedItem = items.find((item) => item.itemId === id);
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
              onDeleteItem={(itemId) => {
                if (selectedItemId === itemId) setSelectedItemId(null);
                deleteItem.mutate(itemId);
              }}
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
        item={draggingItemId ? items.find((i) => i.itemId === draggingItemId) ?? null : null}
        dayColor={
          draggingItemId
            ? days.find((d) => d.dayId === items.find((i) => i.itemId === draggingItemId)?.dayId)?.colorHex
            : undefined
        }
        isOverTimeline={isDragOverTimeline}
      />
    </>
  );
}

function TripDashboard() {
  const { accessToken, isGapiReady } = useAuth();
  const navigate = useNavigate();
  const [schemaStatus, setSchemaStatus] = useState<'validating' | 'valid' | 'invalid' | 'initializing' | 'creating' | null>(
    null,
  );
  const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
  const [loadableTrips, setLoadableTrips] = useState<LoadableTripSummary[]>([]);
  const [isLoadingLoadableTrips, setIsLoadingLoadableTrips] = useState(false);
  const [loadableTripsError, setLoadableTripsError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !isGapiReady) {
      setLoadableTrips([]);
      setIsLoadingLoadableTrips(false);
      setLoadableTripsError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingLoadableTrips(true);
    setLoadableTripsError(null);

    void (async () => {
      try {
        const trips = await discoverLoadableTrips(accessToken);
        if (!cancelled) {
          setLoadableTrips(trips);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadableTrips([]);
          setLoadableTripsError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLoadableTrips(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isGapiReady]);

  const handleCreateTrip = useCallback(async (name: string, startDate: string, endDate: string, timezone: string) => {
    setSchemaStatus('creating');
    setSchemaErrors([]);
    try {
      // Create a new spreadsheet
      const newId = await createSpreadsheet(name);
      localStorage.setItem('tp_spreadsheet_id', newId);

      // Initialize the schema
      setSchemaStatus('initializing');
      const result = await initializeSheet(newId, name);

      if (result.valid) {
        // Also save the trip metadata
        const { getGapiClient } = await import('./lib/google-api');
        const sheets = getGapiClient();
        await sheets.spreadsheets.values.update({
          spreadsheetId: newId,
          range: "'Trip'!A2",
          valueInputOption: 'RAW',
          resource: {
            values: [[crypto.randomUUID(), name, timezone, startDate, endDate, 'driving', 0, 0, '', '']],
          },
        });

        // Auto-generate days from the date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days: Day[] = [];
        let dayIndex = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push({
            dayId: crypto.randomUUID(),
            date: d.toISOString().split('T')[0],
            label: `Day ${dayIndex + 1}`,
            colorHex: getDayColor(dayIndex),
            dayStart: '08:00',
            dayEnd: '22:00',
          });
          dayIndex++;
        }
        if (days.length > 0) {
          await saveDays(newId, days);
        }

        // Navigate to the trip URL
        navigate(`/trip/${newId}`);
      } else {
        setSchemaStatus('invalid');
        setSchemaErrors(result.errors);
      }
    } catch (err) {
      setSchemaStatus('invalid');
      setSchemaErrors([(err as Error).message]);
    }
  }, [navigate]);

  const handleImportSheet = useCallback(async () => {
    if (!accessToken) return;

    try {
      const result = await openSheetPicker(accessToken);
      if (!result) return; // User cancelled

      localStorage.setItem('tp_spreadsheet_id', result.spreadsheetId);
      setSchemaStatus('validating');

      const validation = await validateSchema(result.spreadsheetId);
      if (validation.valid) {
        // Navigate to the trip URL
        navigate(`/trip/${result.spreadsheetId}`);
      } else {
        setSchemaStatus('invalid');
        setSchemaErrors(validation.errors);
      }
    } catch (err) {
      setSchemaStatus('invalid');
      setSchemaErrors([(err as Error).message]);
    }
  }, [accessToken, navigate]);

  const handleOpenKnownTrip = useCallback((spreadsheetId: string) => {
    localStorage.setItem('tp_spreadsheet_id', spreadsheetId);
    navigate(`/trip/${spreadsheetId}`);
  }, [navigate]);

  return (
    <TripSetup
      onCreateTrip={handleCreateTrip}
      onImportSheet={handleImportSheet}
      onOpenKnownTrip={handleOpenKnownTrip}
      schemaStatus={schemaStatus}
      schemaErrors={schemaErrors}
      isGapiReady={isGapiReady}
      loadableTrips={loadableTrips}
      isLoadingLoadableTrips={isLoadingLoadableTrips}
      loadableTripsError={loadableTripsError}
    />
  );
}

function TripRoute() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { isGapiReady } = useAuth();
  const [schemaStatus, setSchemaStatus] = useState<'validating' | 'valid' | 'invalid' | null>(null);
  const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
  const localSnapshot = tripId ? getMostRecentLocalSnapshot(readUndoHistory(tripId)) : null;

  const runValidation = useCallback(async () => {
    if (!tripId) return;
    setSchemaStatus('validating');
    try {
      const result = await validateSchema(tripId);
      if (result.valid) {
        setSchemaStatus('valid');
        setSchemaErrors([]);
        localStorage.setItem('tp_spreadsheet_id', tripId);
      } else {
        setSchemaStatus('invalid');
        setSchemaErrors(result.errors);
      }
    } catch (err) {
      setSchemaStatus('invalid');
      setSchemaErrors([(err as Error).message]);
    }
  }, [tripId]);

  const handleRepairSchema = useCallback(async () => {
    if (!tripId || !isGapiReady) return;
    setSchemaStatus('validating');
    try {
      await initializeSheet(tripId, localSnapshot?.trip.name || 'Recovered Trip');
    } catch (err) {
      setSchemaStatus('invalid');
      setSchemaErrors([(err as Error).message]);
      return;
    }
    await runValidation();
  }, [isGapiReady, localSnapshot?.trip.name, runValidation, tripId]);

  const handleRestoreFromLocal = useCallback(async () => {
    if (!tripId || !isGapiReady) return;
    const snapshot = getMostRecentLocalSnapshot(readUndoHistory(tripId));
    if (!snapshot) return;

    setSchemaStatus('validating');
    try {
      await initializeSheet(tripId, snapshot.trip.name || 'Recovered Trip');
      await overwriteTripCoreTabs({ spreadsheetId: tripId, snapshot });
    } catch (err) {
      setSchemaStatus('invalid');
      setSchemaErrors([(err as Error).message]);
      return;
    }

    await runValidation();
  }, [isGapiReady, runValidation, tripId]);

  useEffect(() => {
    if (!tripId || !isGapiReady) return;

    void runValidation();
  }, [tripId, isGapiReady, runValidation]);

  if (!tripId) {
    navigate('/');
    return null;
  }

  if (!isGapiReady || schemaStatus === 'validating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
          <p className="mt-4 text-sm text-theme-secondary">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (schemaStatus === 'invalid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold text-theme">Cannot Access Trip</h1>
          <SchemaStatus status="invalid" errors={schemaErrors} />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRepairSchema}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Repair Schema
            </button>
            {localSnapshot && (
              <button
                onClick={handleRestoreFromLocal}
                className="rounded-xl border border-theme bg-theme-elevated px-4 py-2 text-sm font-semibold text-theme shadow-theme-sm transition-all hover:bg-theme-subtle"
              >
                Restore From Local History
              </button>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <TripApp spreadsheetId={tripId} />;
}

function RootLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <TripDashboard /> },
      { path: 'trip/:tripId', element: <TripRoute /> },
    ],
  },
]);
