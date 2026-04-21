import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Item } from '@/types/trip';
import { mapsRepository, type PlaceSearchResult } from '@/services/maps-repository';
import type { EventEditorValue } from './EventEditorForm';
import type { CalculatedRoute } from './useRouteCalculation';
import {
  applyCalculatedRouteToEditorValue,
  emptyRouteMetadata,
  useItemRouteEditorState,
} from './useItemRouteEditorState';

export interface ItemDetailCardModelInput {
  item: Item;
  onUpdate?: (updates: Partial<Item>) => void;
}

export interface ItemDetailCardModel {
  rootRef: RefObject<HTMLDivElement | null>;
  titleValue: string;
  editorValue: EventEditorValue;
  originPlaceDetails: PlaceSearchResult | null;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  calculatedRoute: CalculatedRoute | null;
  isCalculatingRoute: boolean;
  openInGoogleMapsUrl?: string;
  displayedRouteDurationMinutes: number;
  hasCalculatedRoute: boolean;
  hasOrigin: boolean;
  hasDest: boolean;
  showTravelControls: boolean;
  canCalculateRoute: boolean;
  routeBadge: string;
  handleTitleChange: (next: string) => void;
  handleTitleCommit: () => void;
  handleEditorChange: (next: EventEditorValue) => void;
  handleOriginSelect: (place: PlaceSearchResult) => void;
  handleDestinationSelect: (place: PlaceSearchResult) => void;
  handleOriginEditStart: () => void;
  handleOriginEditCancel: () => void;
  handleDestinationEditStart: () => void;
  handleDestinationEditCancel: () => void;
  handleDestinationClear: () => void;
  handleRouteChange: (next: {
    transportMode: EventEditorValue['transportMode'];
    itemRouteType: EventEditorValue['itemRouteType'];
  }) => void;
  handleCalculateRoute: () => Promise<CalculatedRoute | null>;
  clearCalculatedRoute: () => void;
}

function itemToEditorValue(item: Item): EventEditorValue {
  return {
    type: item.type,
    transportMode: item.transportMode,
    itemRouteType: item.itemRouteType,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    durationMinutes: item.durationMinutes,
    notesMd: item.notesMd,
    availabilityWindows: item.availabilityWindows,
    timelineLocked: item.timelineLocked,
  };
}

function areEditorValuesEqual(left: EventEditorValue, right: EventEditorValue): boolean {
  return (
    left.type === right.type &&
    left.transportMode === right.transportMode &&
    left.itemRouteType === right.itemRouteType &&
    left.scheduledStart === right.scheduledStart &&
    left.scheduledEnd === right.scheduledEnd &&
    left.durationMinutes === right.durationMinutes &&
    left.notesMd === right.notesMd &&
    left.availabilityWindows === right.availabilityWindows &&
    left.timelineLocked === right.timelineLocked
  );
}

export function useItemDetailCardModel({
  item,
  onUpdate,
}: ItemDetailCardModelInput): ItemDetailCardModel {
  const [titleValue, setTitleValue] = useState(item.placeName);
  const [editorValue, setEditorValue] = useState<EventEditorValue>(() => itemToEditorValue(item));
  const [originPlaceDetails, setOriginPlaceDetails] = useState<PlaceSearchResult | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleHasManualOverrideRef = useRef(false);
  const previousItemIdRef = useRef(item.itemId);
  const nextEditorValue = useMemo(() => itemToEditorValue(item), [item]);

  const hasDest = item.destLat !== 0 || item.destLng !== 0;
  const hasOrigin = item.lat !== 0 || item.lng !== 0;
  const originDefaultTitle = (originPlaceDetails?.name || item.placeName).trim();

  const commit = useCallback(
    (updates: Partial<Item>) => {
      onUpdate?.(updates);
    },
    [onUpdate],
  );

  const routeEditor = useItemRouteEditorState({
    origin: hasOrigin ? { lat: item.lat, lng: item.lng } : null,
    destination: hasDest ? { lat: item.destLat, lng: item.destLng } : null,
    transportMode: editorValue.transportMode,
    itemRouteType: editorValue.itemRouteType,
    itemType: editorValue.type,
    existingRouteDurationMinutes: item.itemRouteDurationMinutes,
    hasPersistedRoute:
      Boolean(item.itemRoutePathEncoded) ||
      item.itemRouteDistanceMeters > 0 ||
      item.itemRouteDurationMinutes > 0,
    onCalculated: useCallback(
      (route: CalculatedRoute) => {
        setEditorValue((current) => applyCalculatedRouteToEditorValue(current, route));
        commit({
          itemRoutePathEncoded: route.itemRoutePathEncoded,
          itemRouteDistanceMeters: route.itemRouteDistanceMeters,
          itemRouteDurationMinutes: route.itemRouteDurationMinutes,
        });
      },
      [commit],
    ),
  });
  const {
    clearCalculatedRoute,
    resetUiState,
    handleOriginEditCancel,
    handleDestinationEditCancel,
  } = routeEditor;

  useEffect(() => {
    const didSwitchItems = previousItemIdRef.current !== item.itemId;
    previousItemIdRef.current = item.itemId;

    setEditorValue((current) => {
      if (areEditorValuesEqual(current, nextEditorValue)) {
        return current;
      }

      const activeElement =
        typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (!didSwitchItems && activeElement && rootRef.current?.contains(activeElement)) {
        return current;
      }

      return nextEditorValue;
    });

    const activeElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const isTitleInputFocused = activeElement?.dataset.itemTitleInput === 'true';

    setTitleValue((current) => {
      if (current === item.placeName) {
        return current;
      }

      if (!didSwitchItems && isTitleInputFocused) {
        return current;
      }

      titleHasManualOverrideRef.current = false;
      return item.placeName;
    });
  }, [item.itemId, item.placeName, nextEditorValue]);

  useEffect(() => {
    titleHasManualOverrideRef.current =
      Boolean(titleValue.trim()) && titleValue.trim() !== originDefaultTitle;
  }, [originDefaultTitle, titleValue]);

  useEffect(() => {
    resetUiState();
  }, [item.itemId, resetUiState]);

  useEffect(() => {
    let cancelled = false;

    if (!item.placeId || item.placeId.startsWith('custom-')) {
      setOriginPlaceDetails(null);
      return () => {
        cancelled = true;
      };
    }

    setOriginPlaceDetails(null);
    mapsRepository
      .getPlaceDetails(item.placeId)
      .then((place) => {
        if (!cancelled) setOriginPlaceDetails(place);
      })
      .catch(() => {
        if (!cancelled) setOriginPlaceDetails(null);
      });

    return () => {
      cancelled = true;
    };
  }, [item.placeId]);

  const handleEditorChange = useCallback(
    (next: EventEditorValue) => {
      setEditorValue(next);
      const updates: Partial<Item> = {};

      if (next.type !== editorValue.type) updates.type = next.type;
      if (next.transportMode !== editorValue.transportMode) updates.transportMode = next.transportMode;
      if (next.itemRouteType !== editorValue.itemRouteType) updates.itemRouteType = next.itemRouteType;
      if (next.scheduledStart !== editorValue.scheduledStart) updates.scheduledStart = next.scheduledStart;
      if (next.scheduledEnd !== editorValue.scheduledEnd) updates.scheduledEnd = next.scheduledEnd;
      if (next.durationMinutes !== editorValue.durationMinutes) updates.durationMinutes = next.durationMinutes;
      if (next.notesMd !== editorValue.notesMd) updates.notesMd = next.notesMd;
      if (next.availabilityWindows !== editorValue.availabilityWindows) {
        updates.availabilityWindows = next.availabilityWindows;
      }
      if (next.timelineLocked !== editorValue.timelineLocked) {
        updates.timelineLocked = next.timelineLocked;
      }

      if (
        next.transportMode !== editorValue.transportMode ||
        next.itemRouteType !== editorValue.itemRouteType
      ) {
        clearCalculatedRoute();
        Object.assign(updates, emptyRouteMetadata());
      }

      if (Object.keys(updates).length > 0) {
        commit(updates);
      }
    },
    [clearCalculatedRoute, commit, editorValue],
  );

  const handleTitleChange = useCallback((next: string) => {
    setTitleValue(next);
  }, []);

  const handleTitleCommit = useCallback(() => {
    const normalized = titleValue.trim() || originDefaultTitle || item.placeName;
    setTitleValue(normalized);
    titleHasManualOverrideRef.current = normalized !== originDefaultTitle;

    if (normalized !== item.placeName) {
      commit({ placeName: normalized });
    }
  }, [commit, item.placeName, originDefaultTitle, titleValue]);

  const handleOriginSelect = useCallback(
    (place: PlaceSearchResult) => {
      const normalizedTitle = titleValue.trim();
      const shouldFollowOriginTitle =
        !titleHasManualOverrideRef.current ||
        !normalizedTitle ||
        normalizedTitle === originDefaultTitle;
      const nextTitle = shouldFollowOriginTitle ? place.name : normalizedTitle;

      clearCalculatedRoute();
      setTitleValue(nextTitle);
      titleHasManualOverrideRef.current = !shouldFollowOriginTitle;
      commit({
        placeId: place.placeId,
        placeName: nextTitle,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        ...emptyRouteMetadata(),
      });
      handleOriginEditCancel();
    },
    [clearCalculatedRoute, commit, handleOriginEditCancel, originDefaultTitle, titleValue],
  );

  const handleDestinationSelect = useCallback(
    (place: PlaceSearchResult) => {
      clearCalculatedRoute();
      commit({
        destLat: place.lat,
        destLng: place.lng,
        destName: place.name,
        destAddress: place.address,
        ...emptyRouteMetadata(),
      });
      handleDestinationEditCancel();
    },
    [clearCalculatedRoute, commit, handleDestinationEditCancel],
  );

  const handleDestinationClear = useCallback(() => {
    clearCalculatedRoute();
    commit({
      destLat: 0,
      destLng: 0,
      destName: '',
      destAddress: '',
      ...emptyRouteMetadata(),
    });
    handleDestinationEditCancel();
  }, [clearCalculatedRoute, commit, handleDestinationEditCancel]);

  const handleRouteChange = useCallback(
    (next: {
      transportMode: EventEditorValue['transportMode'];
      itemRouteType: EventEditorValue['itemRouteType'];
    }) => {
      setEditorValue((current) => {
        if (
          current.transportMode !== next.transportMode ||
          current.itemRouteType !== next.itemRouteType
        ) {
          clearCalculatedRoute();
        }
        return { ...current, ...next };
      });

      commit(
        next.transportMode !== editorValue.transportMode ||
          next.itemRouteType !== editorValue.itemRouteType
          ? {
              transportMode: next.transportMode,
              itemRouteType: next.itemRouteType,
              ...emptyRouteMetadata(),
            }
          : {
              transportMode: next.transportMode,
              itemRouteType: next.itemRouteType,
            },
      );
    },
    [clearCalculatedRoute, commit, editorValue.itemRouteType, editorValue.transportMode],
  );

  return {
    rootRef,
    titleValue,
    editorValue,
    originPlaceDetails,
    isEditingOrigin: routeEditor.isEditingOrigin,
    isEditingDestination: routeEditor.isEditingDestination,
    calculatedRoute: routeEditor.calculatedRoute,
    isCalculatingRoute: routeEditor.isCalculatingRoute,
    openInGoogleMapsUrl: routeEditor.openInGoogleMapsUrl,
    displayedRouteDurationMinutes: routeEditor.displayedRouteDurationMinutes,
    hasCalculatedRoute: routeEditor.hasCalculatedRoute,
    hasOrigin,
    hasDest,
    showTravelControls: routeEditor.showTravelControls,
    canCalculateRoute: routeEditor.canCalculateRoute,
    routeBadge: routeEditor.routeBadge,
    handleTitleChange,
    handleTitleCommit,
    handleEditorChange,
    handleOriginSelect,
    handleDestinationSelect,
    handleOriginEditStart: routeEditor.handleOriginEditStart,
    handleOriginEditCancel: routeEditor.handleOriginEditCancel,
    handleDestinationEditStart: routeEditor.handleDestinationEditStart,
    handleDestinationEditCancel: routeEditor.handleDestinationEditCancel,
    handleDestinationClear,
    handleRouteChange,
    handleCalculateRoute: routeEditor.handleCalculateRoute,
    clearCalculatedRoute,
  };
}
