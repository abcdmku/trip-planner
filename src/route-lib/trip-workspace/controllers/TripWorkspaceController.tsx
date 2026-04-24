import { useParams } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTrip } from '@/hooks/useTrip';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useTripCollaboration } from '@/hooks/useCollaboration';
import { useUI } from '@/hooks/useUI';
import { DayTabs } from '@component-lib/days/DayTabs';
import { DataTransferMenu } from '@component-lib/layout/DataTransferMenu';
import { FollowModeBanner } from '@component-lib/presence/FollowModeBanner';
import { ParticipantStrip } from '@component-lib/presence/ParticipantStrip';
import { ConflictBanner } from '@component-lib/sync/ConflictBanner';
import { TripShareMenu } from '@component-lib/trips/TripShareMenu';
import { ItineraryList } from '@route-lib/trip-workspace/ui/items/ItineraryList';
import { VerticalTimeline } from '@route-lib/trip-workspace/ui/timeline/VerticalTimeline';
import MapShell from '@route-lib/trip-workspace/ui/map/MapShell';
import { CursorPresenceOverlay } from '@route-lib/trip-workspace/ui/presence/CursorPresenceOverlay';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAddDay, useDeleteDay, useUpdateDay } from '@/hooks/useDays';
import { useAddItem, useUpdateItem, useDeleteItem, useReorderItems } from '@/hooks/useItems';
import { useLegs, useUpdateLegMode, useUpdateLegRouteType, useRecalculateLegs } from '@/hooks/useLegs';
import { useUpdateTrip } from '@/hooks/useTrip';
import { useCreateTripInvite, useDeleteTripInvite, useDeleteTripMember } from '@/hooks/useTripSharing';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useUndoRedoHotkeys } from '@/hooks/useUndoRedoHotkeys';
import { START_LOCATION_ID } from '@/services/leg-recompute';
import { ApiError } from '@/services/api-client';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type { TimelineConnector, TimelineConnectorWithTiming } from '@/lib/connectors';
import { getDayTimezoneLabel } from '@/lib/day-time-display';
import { getAutoDayLabel, getDayDisplayLabel } from '@/lib/day-labels';
import { resolveAppendDropAfterLast, minutesToTime } from '@/lib/timeline-drop';
import type { Day, Item, Leg, Trip, TransportMode, RouteType } from '@/types/trip';
import type { PresenceItemPreview } from '@/types/api';
import type {
  PresenceViewport,
} from '@/types/collaboration';
import { TripWorkspaceScreen } from '../screens/TripWorkspaceScreen';
import {
  areMapCamerasEqual,
  areMapOpenLocationsEqual,
  normalizePresenceActiveTab,
} from '../helpers/presence';
import {
  persistTimelineSnapMinutes,
} from '../helpers/timelineSnapStorage';
import { buildSelectedLegPopupProps } from '../helpers/buildSelectedLegPopupProps';
import {
  buildTimelineItemDuplicate,
  mergeTimelineItemUpdates,
  shouldDuplicateTimelineItem,
} from '../helpers/timeline-item-mutations';
import {
  createStartLocationItem,
  buildTravelItemDraft,
  getTripDefaultRouteType,
} from '../helpers/tripWorkspaceLegs';
import { useTripWorkspaceCursorBroadcast } from './useTripWorkspaceCursorBroadcast';
import { useTripWorkspaceDerivedData } from './useTripWorkspaceDerivedData';
import { useTripWorkspaceFollowSync } from './useTripWorkspaceFollowSync';
import { useTripWorkspaceRenderItems } from './useTripWorkspaceRenderItems';
import { useTripWorkspaceUndoSync } from './useTripWorkspaceUndoSync';
import { useTripWorkspaceViewState } from './useTripWorkspaceViewState';
import { useTripDataTransfer } from './useTripDataTransfer';

void useParams;

export function TripWorkspaceController({ tripId }: { tripId: string }) {
  const ENABLE_LEGACY_LEGS = false;
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    connectionState,
    localConnectionId,
    sendCursor,
    clearCursor,
    sendItemPreview,
    sendSelection,
    sendViewport,
    getRemoteEditNotice,
    dismissRemoteEditNotice,
  } = useRealtime();
  const { activeTab, setActiveTab, selectedItemId, setSelectedItemId } = useUI();
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
  const tripDataTransfer = useTripDataTransfer({
    tripId,
    tripData,
    tripName: trip?.name,
  });

  useUndoRedoHotkeys(tripId);
  useTripWorkspaceUndoSync(tripId, tripData, isFetching, ensureSynced);

  const {
    addItemInitialAvailabilityWindows,
    addItemInitialRouteType,
    addItemInitialTimelineLocked,
    addItemInitialTimes,
    addItemInitialTransportMode,
    addItemInitialTravelLink,
    addItemInitialType,
    desktopLeftPanelWidth,
    dragClearTimerRef,
    draggingItemId,
    editingDay,
    editingItemId,
    expandedItemId,
    followedConnectionId,
    isDragOverTimeline,
    itineraryScrollTop,
    jumpToViewportRequest,
    mapCamera,
    mapClickLocation,
    mapEventFilter,
    mapOpenLocation,
    mapSelectedDestination,
    mapSelectedPlace,
    newDayDefaultDate,
    newDayDefaultLabel,
    pendingDayDelete,
    selectedDayId,
    selectedLeg,
    setAddItemInitialAvailabilityWindows,
    setAddItemInitialRouteType,
    setAddItemInitialTimelineLocked,
    setAddItemInitialTimes,
    setAddItemInitialTransportMode,
    setAddItemInitialTravelLink,
    setAddItemInitialType,
    setDesktopLeftPanelWidth,
    setDraggingItemId,
    setEditingDay,
    setEditingItemId,
    setExpandedItemId,
    setFollowedConnectionId,
    setIsDragOverTimeline,
    setItineraryScrollTop,
    setJumpToViewportRequest,
    setMapCamera,
    setMapClickLocation,
    setMapEventFilter,
    setMapOpenLocation,
    setMapSelectedDestination,
    setMapSelectedPlace,
    setNewDayDefaultDate,
    setNewDayDefaultLabel,
    setPendingDayDelete,
    setSelectedDayId,
    setSelectedLeg,
    setShowAddItem,
    setShowDayEditor,
    setShowTimelineConnectors,
    setSuppressedConnectorIds,
    setTimelineSnapMinutes,
    setTimelineViewport,
    setWorkspaceLayout,
    showAddItem,
    showDayEditor,
    showTimelineConnectors,
    suppressedConnectorIds,
    timelineSnapMinutes,
    timelineViewport,
    workspaceLayout,
    workspaceRef,
  } = useTripWorkspaceViewState();
  const {
    participants: tripParticipants,
    cursors: tripCursors,
    itemPreviews: tripItemPreviews,
    remoteObjectPresenceById,
  } = useTripCollaboration(tripId, localConnectionId);
  const remoteEditNotice = getRemoteEditNotice(tripId);
  const [dayRevealRequest, setDayRevealRequest] = useState<{ dayId: string; key: string } | null>(null);

  const renderItems = useTripWorkspaceRenderItems(
    committedItems,
    tripItemPreviews,
    localConnectionId,
  );

  const { applyingFollowStateRef, applyParticipantWorkspaceState, followedParticipant } =
    useTripWorkspaceFollowSync({
    followedConnectionId,
    tripParticipants,
    setFollowedConnectionId,
    setActiveTab,
    setWorkspaceLayout,
    setDesktopLeftPanelWidth,
    setSelectedDayId,
    setMapEventFilter,
    setItineraryScrollTop,
    setSelectedItemId,
    setMapCamera,
    setMapOpenLocation,
    areMapCamerasEqual,
    areMapOpenLocationsEqual,
    });

  useEffect(() => {
    if (selectedItemId) {
      sendSelection(tripId, {
        objectIds: [selectedItemId],
        primaryObjectId: selectedItemId,
      });
      return;
    }
    sendSelection(tripId, null);
  }, [selectedItemId, sendSelection, tripId]);

  useEffect(() => {
    if (!selectedItemId) return;
    setMapOpenLocation((current) => (current ? null : current));
  }, [selectedItemId]);

  useTripWorkspaceCursorBroadcast({
    tripId,
    workspaceRef,
    sendCursor,
    clearCursor,
  });

  const sharedViewport = useMemo(() => {
    const baseViewport = timelineViewport ?? {
      viewMode: 'multi' as PresenceViewport['viewMode'],
      focusedDayId: selectedDayId ?? days[0]?.dayId ?? null,
      scrollLeft: 0,
      scrollTop: 0,
      zoom: 1,
    };

    return {
      ...baseViewport,
      activeTab: normalizePresenceActiveTab(activeTab),
      workspaceLayout,
      leftPanelWidth: desktopLeftPanelWidth,
      selectedDayId,
      itineraryScrollTop,
      mapEventFilter,
      mapCamera,
      mapOpenLocation,
    };
  }, [
    activeTab,
    days,
    desktopLeftPanelWidth,
    itineraryScrollTop,
    mapCamera,
    mapEventFilter,
    mapOpenLocation,
    selectedDayId,
    timelineViewport,
    workspaceLayout,
  ]);

  useEffect(() => {
    if (applyingFollowStateRef.current) return;
    sendViewport(tripId, sharedViewport);
  }, [sendViewport, sharedViewport, tripId]);

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
    persistTimelineSnapMinutes(timelineSnapMinutes);
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
      const fromItem =
        leg.fromItemId === START_LOCATION_ID
          ? trip
            ? createStartLocationItem(trip)
            : undefined
          : itemMap.get(leg.fromItemId);
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

  const {
    dayDropValidityById,
    filteredItems,
    getScheduledItemsForDay,
    itemAppearanceDayIdsById,
    itemDayColorsById,
    mapConnectors,
    mapItemIds,
    mapItems,
    orderedDays,
    selectedDayDisplayItemsById,
    selectedDayIds,
  } = useTripWorkspaceDerivedData({
    days,
    committedItems,
    renderItems,
    selectedDayId,
    mapEventFilter,
    draggingItemId,
    timelineSnapMinutes,
  });

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

      const defaultMode = trip?.defaultMode ?? 'driving';
      const draft = buildTravelItemDraft({ fromItem, toItem, defaultMode });

      setSelectedDayId(draft.selectedDayId);
      resetAddItemDraft();
      setMapSelectedPlace(draft.mapSelectedPlace);
      setMapSelectedDestination(draft.mapSelectedDestination);
      setAddItemInitialType(draft.addItemInitialType);
      setAddItemInitialTransportMode(draft.addItemInitialTransportMode);
      setAddItemInitialRouteType(draft.addItemInitialRouteType);
      setAddItemInitialAvailabilityWindows(draft.addItemInitialAvailabilityWindows);
      setAddItemInitialTimelineLocked(draft.addItemInitialTimelineLocked);
      setAddItemInitialTravelLink(draft.addItemInitialTravelLink);
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

      const defaultMode = trip?.defaultMode ?? 'driving';
      const draft = buildTravelItemDraft({
        fromItem,
        toItem,
        defaultMode,
        startTime: minutesToTime(connector.fromEndMin),
        endTime: minutesToTime(connector.toStartMin),
      });

      // Use the gap timing from the connector for the travel event
      setSelectedDayId(draft.selectedDayId);
      resetAddItemDraft();
      setMapSelectedPlace(draft.mapSelectedPlace);
      setMapSelectedDestination(draft.mapSelectedDestination);
      setAddItemInitialType(draft.addItemInitialType);
      setAddItemInitialTransportMode(draft.addItemInitialTransportMode);
      setAddItemInitialRouteType(draft.addItemInitialRouteType);
      setAddItemInitialAvailabilityWindows(draft.addItemInitialAvailabilityWindows);
      setAddItemInitialTimelineLocked(draft.addItemInitialTimelineLocked);
      setAddItemInitialTravelLink(draft.addItemInitialTravelLink);
      setAddItemInitialTimes(draft.addItemInitialTimes);
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

  const handleEditDay = useCallback((day: Day) => {
    setEditingDay(day);
    setNewDayDefaultDate(day.date);
    setNewDayDefaultLabel(day.label);
    setShowDayEditor(true);
  }, []);

  const handleCloseDayEditor = useCallback(() => {
    setShowDayEditor(false);
    setEditingDay(undefined);
  }, []);

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

  const handleSelectDay = useCallback(
    (dayId: string | null) => {
      if (dayId && dayId === selectedDayId) {
        setDayRevealRequest({ dayId, key: crypto.randomUUID() });
      }
      setSelectedDayId(dayId);
    },
    [selectedDayId, setSelectedDayId],
  );

  const handleSaveDay = (dayData: Partial<Day> & { dayId: string }) => {
    if (editingDay) {
      updateDay.mutate({
        ...editingDay,
        ...dayData,
        timezone: dayData.timezone ?? editingDay.timezone ?? trip?.baseTimezone ?? 'UTC',
      });
    } else {
      addDay.mutate({
        dayId: dayData.dayId,
        date: dayData.date ?? '',
        label: dayData.label ?? '',
        colorHex: dayData.colorHex ?? '#3B82F6',
        dayStart: dayData.dayStart ?? '08:00',
        dayEnd: dayData.dayEnd ?? '22:00',
        timezone: dayData.timezone ?? trip?.baseTimezone ?? 'UTC',
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
        itemRouteType:
          data.itemRouteType ?? getTripDefaultRouteType(data.transportMode ?? trip?.defaultMode),
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

  const handleTimelineItemUpdate = useCallback(
    (itemId: string, updates: Partial<Item>) => {
      const existing = committedItems.find((item) => item.itemId === itemId);
      if (!existing) return;

      const merged = mergeTimelineItemUpdates(existing, updates);
      if (shouldDuplicateTimelineItem(existing, draggingItemId)) {
        addItem.mutate(buildTimelineItemDuplicate(merged, committedItems));
        return;
      }

      updateItem.mutate(merged);
    },
    [addItem, committedItems, draggingItemId, updateItem],
  );

  const editingItem = useMemo(
    () =>
      editingItemId
        ? committedItems.find((item) => item.itemId === editingItemId) ?? null
        : null,
    [committedItems, editingItemId],
  );
  const selectedDisplayDay = useMemo(
    () =>
      (selectedDayId ? days.find((day) => day.dayId === selectedDayId) : null) ??
      days[0] ??
      null,
    [days, selectedDayId],
  );
  const selectedDayTimezoneLabel = useMemo(
    () => getDayTimezoneLabel(selectedDisplayDay),
    [selectedDisplayDay],
  );
  const editingItemDisplayDay = useMemo(() => {
    if (!editingItem) return null;
    const appearanceDayIds = itemAppearanceDayIdsById.get(editingItem.itemId) ?? [];
    const dayId =
      selectedDayId && appearanceDayIds.includes(selectedDayId)
        ? selectedDayId
        : appearanceDayIds[0] ?? editingItem.dayId;
    return dayId ? days.find((day) => day.dayId === dayId) ?? null : null;
  }, [days, editingItem, itemAppearanceDayIdsById, selectedDayId]);

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

      const merged = mergeTimelineItemUpdates(item, {
        dayId,
        scheduledStart: minutesToTime(resolution.startMin),
        scheduledEnd: minutesToTime(resolution.endMin),
        durationMinutes: resolution.durationMinutes,
        sortOrder: targetDayItems.length,
      });

      if (shouldDuplicateTimelineItem(item, draggingItemId)) {
        addItem.mutate(buildTimelineItemDuplicate(merged, committedItems));
        return;
      }

      updateItem.mutate(merged);
    },
    [addItem, committedItems, days, draggingItemId, getScheduledItemsForDay, timelineSnapMinutes, updateItem],
  );

  const activeCollaborators = useMemo(
    () =>
      tripParticipants
        .filter((participant) => participant.connectionId !== localConnectionId)
        .map((participant) => ({
          connectionId: participant.connectionId,
          userId: participant.userId,
          name: participant.name,
          picture: participant.picture,
          color: participant.color,
        })),
    [localConnectionId, tripParticipants],
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
            mode?: PresenceItemPreview['mode'];
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
        mode: 'append',
      });
    },
    [clearLiveItemPreview, committedItems, days, getScheduledItemsForDay, sendItemPreview, timelineSnapMinutes, tripId],
  );
  const handleJumpToParticipant = useCallback(
    (connectionId: string) => {
      const participant = tripParticipants.find((entry) => entry.connectionId === connectionId);
      const targetViewport = participant?.viewport;
      if (!targetViewport) return;
      applyParticipantWorkspaceState(participant);
      setJumpToViewportRequest({
        key: `${connectionId}:${targetViewport.updatedAt}`,
        viewport: targetViewport,
      });
    },
    [applyParticipantWorkspaceState, tripParticipants],
  );
  const handleTimelineViewportChange = useCallback(
    (viewport: {
      viewMode: PresenceViewport['viewMode'];
      focusedDayId: string | null;
      scrollLeft: number;
      scrollTop: number;
      zoom: number;
    }) => {
      setTimelineViewport(viewport);
    },
    [],
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
    return <TripWorkspaceScreen status="loading" />;
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return (
      <TripWorkspaceScreen
        status="error"
        title={status === 403 ? 'Trip Access Denied' : 'Unable to Load Trip'}
        message={error.message}
        onBackToTrips={() => {
          window.location.assign('/');
        }}
      />
    );
  }

  const selectedLegPopupProps = buildSelectedLegPopupProps({
    itemMap,
    onClose: () => setSelectedLeg(null),
    onModeChange: handleModeChange,
    onRouteTypeChange: handleRouteTypeChange,
    selectedLeg,
    trip,
  });

  return (
    <TripWorkspaceScreen
      status="ready"
      appShellProps={{
        activeTab: activeTab === 'itinerary' || activeTab === 'timeline' ? activeTab : 'map',
        onActiveTabChange: setActiveTab,
        workspaceRef,
        tripName: trip?.name,
        timelineDayCount: days.length,
        syncStatus,
        user: user ? { name: user.name, picture: user.picture } : undefined,
        onLogout: () => void logout(),
        onHomeClick: () => {
          window.location.assign('/');
        },
        participantStrip: (
          <ParticipantStrip
            participants={tripParticipants}
            localConnectionId={localConnectionId}
            followedConnectionId={followedConnectionId}
            onFollow={setFollowedConnectionId}
            onJumpTo={handleJumpToParticipant}
            onStopFollowing={() => setFollowedConnectionId(null)}
          />
        ),
        shareControl:
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
          ) : null,
        dataTransferControl: (
          <DataTransferMenu
            status={tripDataTransfer.status}
            message={tripDataTransfer.message}
            disabled={!tripData}
            onExportData={tripDataTransfer.exportData}
            onLoadData={tripDataTransfer.loadData}
          />
        ),
        activeCollaborators,
        followStatus: followedParticipant ? (
          <FollowModeBanner
            name={followedParticipant.name}
            contextLabel={
              activeTab === 'timeline'
                ? 'Timeline'
                : activeTab === 'itinerary'
                  ? 'Itinerary'
                  : 'Map'
            }
            onExit={() => setFollowedConnectionId(null)}
          />
        ) : null,
        desktopLayoutMode: workspaceLayout,
        onDesktopLayoutModeChange: setWorkspaceLayout,
        desktopLeftPanelWidth,
        onDesktopLeftPanelWidthChange: setDesktopLeftPanelWidth,
        itineraryScrollTop,
        onItineraryScroll: setItineraryScrollTop,
        theme,
        onThemeChange: setTheme,
        workspaceOverlay: (
          <CursorPresenceOverlay
            cursors={tripCursors}
            currentConnectionId={localConnectionId}
          />
        ),
        topBanner: remoteEditNotice ? (
          <ConflictBanner
            message={remoteEditNotice}
            onDismiss={() => dismissRemoteEditNotice(tripId)}
          />
        ) : null,
        dayTabs: (
          <DayTabs
            days={days}
            baseTimezone={trip?.baseTimezone}
            selectedDayId={selectedDayId}
            onSelectDay={handleSelectDay}
            onEditDay={handleEditDay}
            onAddDay={handleAddDay}
            onDeleteSelectedDay={handleDeleteSelectedDay}
            onDropItem={handleMoveItemToDay}
            onItemDragPreviewChange={handleDayTabItemPreviewChange}
            draggingItemId={draggingItemId}
            dropValidityByDay={dayDropValidityById}
          />
        ),
        itinerary: (
          <ItineraryList
            items={filteredItems}
            days={days}
            itemDayColorsById={itemDayColorsById}
            displayItemsById={selectedDayDisplayItemsById}
            trip={trip}
            selectedDayId={selectedDayId}
            selectedItemId={selectedItemId}
            expandedItemId={expandedItemId}
            onExpandedItemChange={setExpandedItemId}
            onReorder={(ids) => {
              const dayId = selectedDayId ?? days[0]?.dayId ?? '';
              const orderedItemIds = selectedDayId
                ? ids.filter(
                    (id) =>
                      committedItems.find((item) => item.itemId === id)?.dayId ===
                      selectedDayId,
                  )
                : ids;
              reorderItems.mutate({ dayId, orderedItemIds });
            }}
            onUpdateItem={(id: string, updates: Partial<Item>) => {
              const existing = committedItems.find((item) => item.itemId === id);
              if (existing) updateItem.mutate(mergeTimelineItemUpdates(existing, updates));
            }}
            onDeleteItem={handleDeleteItem}
            onAddItem={() => {
              resetAddItemDraft();
              setShowAddItem(true);
            }}
            onItemClick={(id: string) => {
              setSelectedItemId(id);
              setActiveTab('itinerary');
            }}
            onUpdateTrip={handleUpdateTrip}
            onExternalDragStart={handleExternalDragStart}
            onExternalDragEnd={handleExternalDragEnd}
          />
        ),
        timeline: (
          <VerticalTimeline
            items={renderItems}
            days={days}
            baseTimezone={trip?.baseTimezone}
            selectedDayIds={selectedDayIds ?? []}
            dayRevealRequest={dayRevealRequest}
            selectedItemId={selectedItemId}
            activeDragItemId={draggingItemId}
            snapMinutes={timelineSnapMinutes}
            onSnapMinutesChange={setTimelineSnapMinutes}
            onDragOverTimeline={setIsDragOverTimeline}
            onUpdateItem={handleTimelineItemUpdate}
            onDeleteItem={handleDeleteItem}
            onLiveItemPreviewChange={handleLiveItemPreviewChange}
            onEditDay={handleEditDay}
            onItemClick={(id: string) => {
              setSelectedItemId(id);
              const clickedItem = committedItems.find((item) => item.itemId === id);
              if (
                clickedItem &&
                selectedDayId !== null &&
                clickedItem.dayId !== selectedDayId
              ) {
                setSelectedDayId(clickedItem.dayId);
              }
            }}
            onItemDoubleClick={(id: string) => {
              setSelectedItemId(id);
              setExpandedItemId(id);
              setActiveTab('itinerary');
              const clickedItem = committedItems.find((item) => item.itemId === id);
              if (
                clickedItem &&
                selectedDayId !== null &&
                clickedItem.dayId !== selectedDayId
              ) {
                setSelectedDayId(clickedItem.dayId);
              }
            }}
            onCreateAtTime={(dayId: string, startTime: string, endTime: string) => {
              setSelectedDayId(dayId);
              resetAddItemDraft();
              setAddItemInitialTimes({ start: startTime, end: endTime });
              setShowAddItem(true);
            }}
            onTimelineConnectorClick={handleTimelineConnectorClick}
            onTimelineConnectorRemove={handleTimelineConnectorRemove}
            suppressedConnectorIds={suppressedConnectorIds}
            showTimelineConnectors={showTimelineConnectors}
            onToggleTimelineConnectors={() =>
              setShowTimelineConnectors((prev) => !prev)
            }
            remoteObjectPresenceById={remoteObjectPresenceById}
            onViewportChange={handleTimelineViewportChange}
            followViewport={followedParticipant?.viewport ?? null}
            jumpToViewport={jumpToViewportRequest}
            onJumpApplied={(key: string) =>
              setJumpToViewportRequest((current) =>
                current?.key === key ? null : current,
              )
            }
          />
        ),
        map: (
          <div className="relative h-full">
            <MapShell
              items={mapItems}
              legs={ENABLE_LEGACY_LEGS ? legs : []}
              days={days}
              trip={trip}
              selectedDay={selectedDisplayDay}
              displayItemsById={selectedDayDisplayItemsById}
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
              onCameraChange={setMapCamera}
              openLocation={mapOpenLocation}
              onOpenLocationChange={setMapOpenLocation}
              followCamera={followedParticipant?.viewport?.mapCamera ?? null}
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
        ),
      }}
      dayEditorProps={{
        day: editingDay,
        isOpen: showDayEditor,
        defaultLabel: newDayDefaultLabel,
        defaultDate: newDayDefaultDate,
        baseTimezone: trip?.baseTimezone,
        onClose: handleCloseDayEditor,
        onSave: handleSaveDay,
      }}
      deleteDayDialogProps={{
        isOpen: Boolean(pendingDayDelete),
        dayLabel: pendingDayDelete?.label ?? '',
        eventCount: pendingDayDelete?.eventCount ?? 0,
        isDeleting: deleteDay.isPending,
        onCancel: () => {
          if (deleteDay.isPending) return;
          setPendingDayDelete(null);
        },
        onConfirm: handleConfirmDeleteDay,
      }}
      addItemDialogProps={{
        isOpen: showAddItem,
        onClose: closeAddItemDialog,
        onAdd: handleAddItem,
        isSubmitting: addItem.isPending,
        initialPlace: mapSelectedPlace,
        initialDestination: mapSelectedDestination,
        initialLocation: mapClickLocation,
        initialStartTime: addItemInitialTimes?.start,
        initialEndTime: addItemInitialTimes?.end,
        initialType: addItemInitialType,
        initialTransportMode: addItemInitialTransportMode,
        initialRouteType: addItemInitialRouteType,
        initialAvailabilityWindows: addItemInitialAvailabilityWindows,
        initialTimelineLocked: addItemInitialTimelineLocked,
        initialTravelFromItemId: addItemInitialTravelLink?.fromItemId,
        initialTravelToItemId: addItemInitialTravelLink?.toItemId,
        defaultDate: selectedDisplayDay?.date,
        defaultTimezoneLabel: selectedDayTimezoneLabel,
      }}
      itemEditorDialogProps={{
        isOpen: Boolean(editingItem),
        item: editingItem,
        dayColor: editingItemDisplayDay?.colorHex,
        dayDate: editingItemDisplayDay?.date,
        dayTimezoneLabel: getDayTimezoneLabel(editingItemDisplayDay),
        onUpdate: (updates) => {
          if (!editingItem) return;
          updateItem.mutate(mergeTimelineItemUpdates(editingItem, updates));
        },
        onDelete: () => {
          if (!editingItem) return;
          handleDeleteItem(editingItem.itemId);
        },
        onClose: () => setEditingItemId(null),
      }}
      legInfoPopupProps={selectedLegPopupProps}
      dragOverlayProps={{
        item:
          draggingItemId
            ? committedItems.find((item) => item.itemId === draggingItemId) ?? null
            : null,
        dayColor:
          draggingItemId
            ? days.find(
                (day) =>
                  day.dayId ===
                  committedItems.find((item) => item.itemId === draggingItemId)?.dayId,
              )?.colorHex
            : undefined,
        isOverTimeline: isDragOverTimeline,
      }}
    />
  );
}
