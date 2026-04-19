import { useRef, useState } from 'react';
import { loadTimelineSnapMinutes } from '../helpers/timelineSnapStorage';
import type { PlaceSearchResult } from '@/services/maps-repository';
import type {
  PresenceMapCamera,
  PresenceMapOpenLocation,
  PresenceViewport,
  PresenceWorkspaceLayout,
} from '@/types/collaboration';
import type { Day, Item, Leg, RouteType, TransportMode } from '@/types/trip';

export function useTripWorkspaceViewState() {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | undefined>();
  const [newDayDefaultLabel, setNewDayDefaultLabel] = useState('');
  const [newDayDefaultDate, setNewDayDefaultDate] = useState('');
  const [pendingDayDelete, setPendingDayDelete] = useState<{
    dayId: string;
    label: string;
    eventCount: number;
  } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [mapSelectedPlace, setMapSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [mapClickLocation, setMapClickLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSelectedDestination, setMapSelectedDestination] = useState<PlaceSearchResult | null>(
    null,
  );
  const [mapEventFilter, setMapEventFilter] = useState<'all' | 'committed'>('all');
  const [selectedLeg, setSelectedLeg] = useState<Leg | null>(null);
  const [addItemInitialTimes, setAddItemInitialTimes] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [addItemInitialType, setAddItemInitialType] = useState<Item['type'] | undefined>();
  const [addItemInitialTransportMode, setAddItemInitialTransportMode] = useState<
    TransportMode | undefined
  >();
  const [addItemInitialRouteType, setAddItemInitialRouteType] = useState<RouteType | undefined>();
  const [addItemInitialAvailabilityWindows, setAddItemInitialAvailabilityWindows] = useState<
    string | undefined
  >();
  const [addItemInitialTimelineLocked, setAddItemInitialTimelineLocked] = useState<
    boolean | undefined
  >();
  const [addItemInitialTravelLink, setAddItemInitialTravelLink] = useState<{
    fromItemId: string;
    toItemId: string;
  } | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [isDragOverTimeline, setIsDragOverTimeline] = useState(false);
  const [timelineSnapMinutes, setTimelineSnapMinutes] = useState(loadTimelineSnapMinutes);
  const [suppressedConnectorIds, setSuppressedConnectorIds] = useState<Set<string>>(new Set());
  const [showTimelineConnectors, setShowTimelineConnectors] = useState(true);
  const [followedConnectionId, setFollowedConnectionId] = useState<string | null>(null);
  const [jumpToViewportRequest, setJumpToViewportRequest] = useState<{
    key: string;
    viewport: PresenceViewport;
  } | null>(null);
  const dragClearTimerRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [timelineViewport, setTimelineViewport] = useState<{
    viewMode: PresenceViewport['viewMode'];
    focusedDayId: string | null;
    scrollLeft: number;
    scrollTop: number;
    zoom: number;
  } | null>(null);
  const [workspaceLayout, setWorkspaceLayout] = useState<PresenceWorkspaceLayout>('split');
  const [desktopLeftPanelWidth, setDesktopLeftPanelWidth] = useState<number | undefined>(
    undefined,
  );
  const [itineraryScrollTop, setItineraryScrollTop] = useState(0);
  const [mapCamera, setMapCamera] = useState<PresenceMapCamera | null>(null);
  const [mapOpenLocation, setMapOpenLocation] = useState<PresenceMapOpenLocation | null>(null);

  return {
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
  };
}
