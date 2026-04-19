import type { PlaceSearchResult } from '@/services/maps-repository';
import { START_LOCATION_ID } from '@/services/leg-recompute';
import type { Item, RouteType, TransportMode, Trip } from '@/types/trip';

export function createStartLocationItem(trip: Trip): Item {
  return {
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
}

export function getTripDefaultRouteType(defaultMode: TransportMode | undefined): RouteType {
  return defaultMode === 'flight' || defaultMode === 'other' ? 'straight' : 'directions';
}

export interface BuildTravelItemDraftOptions {
  fromItem: Item;
  toItem: Item;
  defaultMode: TransportMode;
  startTime?: string;
  endTime?: string;
}

export interface TravelItemDraft {
  selectedDayId: string;
  mapSelectedPlace: PlaceSearchResult;
  mapSelectedDestination: PlaceSearchResult;
  addItemInitialType: Item['type'];
  addItemInitialTransportMode: TransportMode;
  addItemInitialRouteType: RouteType;
  addItemInitialAvailabilityWindows: string;
  addItemInitialTimelineLocked: boolean;
  addItemInitialTravelLink: { fromItemId: string; toItemId: string };
  addItemInitialTimes: { start: string; end: string } | null;
}

export function buildTravelPlaceFromItem(
  item: Item,
  kind: 'origin' | 'destination',
): PlaceSearchResult {
  if (kind === 'origin') {
    const usesDestination = item.destLat !== 0 || item.destLng !== 0;
    return {
      placeId: usesDestination ? `item-dest-${item.itemId}` : item.placeId || `item-origin-${item.itemId}`,
      name: usesDestination ? item.destName || `${item.placeName} destination` : item.placeName,
      address: usesDestination ? item.destAddress : item.address,
      lat: usesDestination ? item.destLat : item.lat,
      lng: usesDestination ? item.destLng : item.lng,
      types: [],
    };
  }

  return {
    placeId: item.placeId || `item-origin-${item.itemId}`,
    name: item.placeName,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    types: [],
  };
}

export function buildTravelItemDraft({
  fromItem,
  toItem,
  defaultMode,
  startTime,
  endTime,
}: BuildTravelItemDraftOptions): TravelItemDraft {
  return {
    selectedDayId: fromItem.dayId,
    mapSelectedPlace: buildTravelPlaceFromItem(fromItem, 'origin'),
    mapSelectedDestination: buildTravelPlaceFromItem(toItem, 'destination'),
    addItemInitialType: 'transport',
    addItemInitialTransportMode: defaultMode,
    addItemInitialRouteType: getTripDefaultRouteType(defaultMode),
    addItemInitialAvailabilityWindows: '[]',
    addItemInitialTimelineLocked: false,
    addItemInitialTravelLink: {
      fromItemId: fromItem.itemId,
      toItemId: toItem.itemId,
    },
    addItemInitialTimes: startTime && endTime ? { start: startTime, end: endTime } : null,
  };
}
