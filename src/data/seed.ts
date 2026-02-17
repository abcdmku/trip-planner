import { DAY_COLORS } from '../constants/colors';
import type { ItineraryItem, MetaRow, Trip, TripDay, TripWorkspace } from '../types/domain';
import { makeId } from '../utils/ids';
import { plusDays, todayIsoDate } from '../utils/time';

function buildDays(startDate: string): TripDay[] {
  return [
    {
      dayId: makeId('day'),
      date: startDate,
      label: 'Day 1',
      colorHex: DAY_COLORS[0],
      dayStart: '08:00',
      dayEnd: '21:00'
    },
    {
      dayId: makeId('day'),
      date: plusDays(startDate, 1),
      label: 'Day 2',
      colorHex: DAY_COLORS[1],
      dayStart: '08:00',
      dayEnd: '21:00'
    }
  ];
}

function buildItems(days: TripDay[]): ItineraryItem[] {
  return [
    {
      itemId: makeId('item'),
      dayId: days[0].dayId,
      sortOrder: 1,
      type: 'poi',
      tags: ['landmark'],
      title: 'Sample Museum',
      sourceKind: 'manual',
      lat: 37.785,
      lng: -122.401,
      startTime: '09:00',
      endTime: '10:30',
      durationMin: 90,
      notesMd: 'Start your trip here.',
      photoUrls: [],
      mode: 'DRIVING',
      isOptional: false,
      priority: 80
    },
    {
      itemId: makeId('item'),
      dayId: days[0].dayId,
      sortOrder: 2,
      type: 'food',
      tags: ['lunch'],
      title: 'Downtown Lunch Stop',
      sourceKind: 'manual',
      lat: 37.781,
      lng: -122.41,
      startTime: '12:00',
      endTime: '13:00',
      durationMin: 60,
      notesMd: 'Try local specials.',
      photoUrls: [],
      mode: 'WALKING',
      isOptional: true,
      priority: 50
    }
  ];
}

export function createSeedWorkspace(sheetId = 'local-seed'): TripWorkspace {
  const startDate = todayIsoDate();
  const days = buildDays(startDate);

  const trip: Trip = {
    id: makeId('trip'),
    name: 'Sample Trip',
    baseTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startDate,
    endDate: plusDays(startDate, 1),
    defaultMode: 'DRIVING',
    sheetId
  };

  const meta: MetaRow = {
    schemaVersion: '1.0.0',
    appVersion: '0.1.0',
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: 'local'
  };

  return {
    trip,
    days,
    items: buildItems(days),
    legs: [],
    history: [],
    meta
  };
}
