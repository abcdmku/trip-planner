import { DAY_COLORS } from '../../constants/colors';
import {
  ALL_TAB_NAMES,
  DAY_COLUMNS,
  HISTORY_COLUMNS,
  ITEM_COLUMNS,
  LEG_COLUMNS,
  META_COLUMNS,
  REQUIRED_SHEET_COLUMNS,
  SCHEMA_VERSION,
  SHEET_TABS,
  TRIP_COLUMNS
} from '../../constants/sheets';
import type {
  HistoryEvent,
  ItineraryItem,
  MetaRow,
  TemplateValidationResult,
  TravelLeg,
  Trip,
  TripDay,
  TripWorkspace
} from '../../types/domain';
import { makeId } from '../../utils/ids';
import { nowIso, plusDays, todayIsoDate } from '../../utils/time';
import type { SavePayload, SheetsRepository } from './SheetsRepository';

interface BatchGetResponse {
  valueRanges?: Array<{ range: string; values?: string[][] }>;
}

interface SpreadsheetMetadata {
  spreadsheetId: string;
  sheets?: Array<{ properties?: { title?: string } }>;
}

function listToCell(values: string[]): string {
  return values.join(' | ');
}

function cellToList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

function asNumber(value: string | undefined, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asBoolean(value: string | undefined): boolean {
  return String(value).toLowerCase() === 'true';
}

function trimToColumns(row: string[], expectedLength: number): string[] {
  const copy = [...row];
  while (copy.length < expectedLength) {
    copy.push('');
  }
  return copy.slice(0, expectedLength);
}

function mapTabRows(valueRanges: BatchGetResponse['valueRanges']): Record<string, string[][]> {
  const map: Record<string, string[][]> = {};

  for (const rangeEntry of valueRanges ?? []) {
    const range = rangeEntry.range ?? '';
    const tabName = range.split('!')[0]?.replace(/'/g, '');
    if (!tabName) {
      continue;
    }
    map[tabName] = rangeEntry.values ?? [];
  }

  return map;
}

export class GoogleSheetsRepository implements SheetsRepository {
  private readonly accessToken: string;
  private readonly appVersion: string;

  constructor(accessToken: string, appVersion: string) {
    this.accessToken = accessToken;
    this.appVersion = appVersion;
  }

  async createWorkspace(input: {
    tripName: string;
    timezone: string;
    actorEmail: string;
  }): Promise<TripWorkspace> {
    const createResponse = await this.request<{ spreadsheetId: string }>(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        method: 'POST',
        body: JSON.stringify({
          properties: {
            title: input.tripName
          },
          sheets: ALL_TAB_NAMES.map((title) => ({
            properties: { title }
          }))
        })
      }
    );

    const sheetId = createResponse.spreadsheetId;
    const startDate = todayIsoDate();
    const endDate = plusDays(startDate, 1);

    const trip: Trip = {
      id: makeId('trip'),
      name: input.tripName,
      baseTimezone: input.timezone,
      startDate,
      endDate,
      defaultMode: 'DRIVING',
      sheetId
    };

    const days: TripDay[] = [
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
        date: endDate,
        label: 'Day 2',
        colorHex: DAY_COLORS[1],
        dayStart: '08:00',
        dayEnd: '21:00'
      }
    ];

    const meta: MetaRow = {
      schemaVersion: SCHEMA_VERSION,
      appVersion: this.appVersion,
      lastUpdatedAt: nowIso(),
      lastUpdatedBy: input.actorEmail
    };

    const historyEvent: HistoryEvent = {
      eventId: makeId('hist'),
      timestamp: nowIso(),
      userEmail: input.actorEmail,
      entityType: 'trip',
      entityId: trip.id,
      action: 'create',
      field: 'trip',
      oldValue: '',
      newValue: trip.name,
      clientId: 'web'
    };

    const workspace: TripWorkspace = {
      trip,
      days,
      items: [],
      legs: [],
      history: [historyEvent],
      meta
    };

    await this.saveWorkspace(sheetId, {
      trip,
      days,
      items: [],
      legs: [],
      meta,
      historyEvents: [historyEvent]
    });

    return workspace;
  }

  async validateTemplate(sheetId: string): Promise<TemplateValidationResult> {
    const metadata = await this.request<SpreadsheetMetadata>(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,sheets.properties.title`
    );

    const tabNames = new Set(metadata.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) as string[]);
    const missingTabs = ALL_TAB_NAMES.filter((tabName) => !tabNames.has(tabName));

    const missingColumns: Record<string, string[]> = {};

    if (missingTabs.length === 0) {
      const ranges = ALL_TAB_NAMES.map((tabName) => `'${tabName}'!1:1`);
      const headerResponse = await this.request<BatchGetResponse>(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=${ranges
          .map((range) => encodeURIComponent(range))
          .join('&ranges=')}`
      );

      const mapped = mapTabRows(headerResponse.valueRanges);

      for (const tabName of ALL_TAB_NAMES) {
        const expected = REQUIRED_SHEET_COLUMNS[tabName];
        const actual = mapped[tabName]?.[0] ?? [];
        const missing = expected.filter((column) => !actual.includes(column));
        if (missing.length > 0) {
          missingColumns[tabName] = missing;
        }
      }
    }

    return {
      valid: missingTabs.length === 0 && Object.keys(missingColumns).length === 0,
      missingTabs,
      missingColumns
    };
  }

  async loadWorkspace(sheetId: string): Promise<TripWorkspace> {
    const validation = await this.validateTemplate(sheetId);

    if (!validation.valid) {
      throw new Error(
        `Sheet template mismatch. Missing tabs: ${validation.missingTabs.join(', ') || 'none'}.`
      );
    }

    const ranges = ALL_TAB_NAMES.map((tabName) => `'${tabName}'!A:ZZ`);
    const dataResponse = await this.request<BatchGetResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=${ranges
        .map((range) => encodeURIComponent(range))
        .join('&ranges=')}`
    );

    const mapped = mapTabRows(dataResponse.valueRanges);

    const tripRows = mapped[SHEET_TABS.TRIP] ?? [];
    const dayRows = mapped[SHEET_TABS.DAYS] ?? [];
    const itemRows = mapped[SHEET_TABS.ITEMS] ?? [];
    const legRows = mapped[SHEET_TABS.LEGS] ?? [];
    const historyRows = mapped[SHEET_TABS.HISTORY] ?? [];
    const metaRows = mapped[SHEET_TABS.META] ?? [];

    const trip = this.parseTrip(tripRows[1], sheetId);
    const days = dayRows.slice(1).map((row) => this.parseDay(row));
    const items = itemRows.slice(1).map((row) => this.parseItem(row));
    const legs = legRows.slice(1).map((row) => this.parseLeg(row));
    const history = historyRows.slice(1).map((row) => this.parseHistory(row));
    const meta = this.parseMeta(metaRows[1]);

    return {
      trip,
      days,
      items,
      legs,
      history,
      meta
    };
  }

  async saveWorkspace(sheetId: string, payload: SavePayload): Promise<void> {
    const updateBody = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `${SHEET_TABS.TRIP}!A1`,
          values: [TRIP_COLUMNS.slice(), this.tripToRow(payload.trip)]
        },
        {
          range: `${SHEET_TABS.DAYS}!A1`,
          values: [DAY_COLUMNS.slice(), ...payload.days.map((day) => this.dayToRow(day))]
        },
        {
          range: `${SHEET_TABS.ITEMS}!A1`,
          values: [ITEM_COLUMNS.slice(), ...payload.items.map((item) => this.itemToRow(item))]
        },
        {
          range: `${SHEET_TABS.LEGS}!A1`,
          values: [LEG_COLUMNS.slice(), ...payload.legs.map((leg) => this.legToRow(leg))]
        },
        {
          range: `${SHEET_TABS.META}!A1`,
          values: [META_COLUMNS.slice(), this.metaToRow(payload.meta)]
        }
      ]
    };

    await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify(updateBody)
    });

    await this.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SHEET_TABS.HISTORY}!A1`,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: `${SHEET_TABS.HISTORY}!A1`,
          majorDimension: 'ROWS',
          values: [HISTORY_COLUMNS.slice()]
        })
      }
    );

    if (payload.historyEvents.length > 0) {
      await this.request(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SHEET_TABS.HISTORY}!A2:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          body: JSON.stringify({
            values: payload.historyEvents.map((event) => this.historyToRow(event))
          })
        }
      );
    }
  }

  private parseTrip(row: string[] | undefined, sheetId: string): Trip {
    const safe = trimToColumns(row ?? [], TRIP_COLUMNS.length);
    return {
      id: safe[0] || makeId('trip'),
      name: safe[1] || 'Untitled Trip',
      baseTimezone: safe[2] || Intl.DateTimeFormat().resolvedOptions().timeZone,
      startDate: safe[3] || todayIsoDate(),
      endDate: safe[4] || todayIsoDate(),
      defaultMode: (safe[5] as Trip['defaultMode']) || 'DRIVING',
      sheetId: safe[6] || sheetId
    };
  }

  private parseDay(row: string[]): TripDay {
    const safe = trimToColumns(row, DAY_COLUMNS.length);
    return {
      dayId: safe[0],
      date: safe[1],
      label: safe[2],
      colorHex: safe[3],
      dayStart: safe[4] || '08:00',
      dayEnd: safe[5] || '21:00'
    };
  }

  private parseItem(row: string[]): ItineraryItem {
    const safe = trimToColumns(row, ITEM_COLUMNS.length);
    return {
      itemId: safe[0],
      dayId: safe[1],
      sortOrder: asNumber(safe[2], 0),
      type: (safe[3] as ItineraryItem['type']) || 'poi',
      tags: cellToList(safe[4]),
      title: safe[5],
      sourceKind: (safe[6] as ItineraryItem['sourceKind']) || 'manual',
      placeId: safe[7] || undefined,
      mapsUrl: safe[8] || undefined,
      lat: asNumber(safe[9]),
      lng: asNumber(safe[10]),
      localTimezone: safe[11] || undefined,
      openingHours: safe[12] || undefined,
      startTime: safe[13] || '09:00',
      endTime: safe[14] || '10:00',
      durationMin: asNumber(safe[15], 60),
      notesMd: safe[16] || '',
      photoUrls: cellToList(safe[17]),
      availabilityStart: safe[18] || undefined,
      availabilityEnd: safe[19] || undefined,
      mode: (safe[20] as ItineraryItem['mode']) || 'DRIVING',
      isOptional: asBoolean(safe[21]),
      priority: asNumber(safe[22], 50)
    };
  }

  private parseLeg(row: string[]): TravelLeg {
    const safe = trimToColumns(row, LEG_COLUMNS.length);
    return {
      legId: safe[0],
      dayId: safe[1],
      fromItemId: safe[2],
      toItemId: safe[3],
      mode: (safe[4] as TravelLeg['mode']) || 'DRIVING',
      departureDateTime: safe[5],
      arrivalDateTime: safe[6],
      durationMin: asNumber(safe[7]),
      distanceMeters: asNumber(safe[8]),
      routePathEncoded: safe[9] || '',
      trafficAware: asBoolean(safe[10]),
      calcStatus: (safe[11] as TravelLeg['calcStatus']) || 'pending',
      calculatedAt: safe[12],
      timezoneChangeLabel: safe[13] || undefined
    };
  }

  private parseHistory(row: string[]): HistoryEvent {
    const safe = trimToColumns(row, HISTORY_COLUMNS.length);
    return {
      eventId: safe[0],
      timestamp: safe[1],
      userEmail: safe[2],
      entityType: (safe[3] as HistoryEvent['entityType']) || 'item',
      entityId: safe[4],
      action: (safe[5] as HistoryEvent['action']) || 'update',
      field: safe[6],
      oldValue: safe[7],
      newValue: safe[8],
      clientId: safe[9]
    };
  }

  private parseMeta(row: string[] | undefined): MetaRow {
    const safe = trimToColumns(row ?? [], META_COLUMNS.length);
    return {
      schemaVersion: safe[0] || SCHEMA_VERSION,
      appVersion: safe[1] || this.appVersion,
      lastUpdatedAt: safe[2] || nowIso(),
      lastUpdatedBy: safe[3] || 'unknown'
    };
  }

  private tripToRow(trip: Trip): string[] {
    return [trip.id, trip.name, trip.baseTimezone, trip.startDate, trip.endDate, trip.defaultMode, trip.sheetId];
  }

  private dayToRow(day: TripDay): string[] {
    return [day.dayId, day.date, day.label, day.colorHex, day.dayStart, day.dayEnd];
  }

  private itemToRow(item: ItineraryItem): string[] {
    return [
      item.itemId,
      item.dayId,
      String(item.sortOrder),
      item.type,
      listToCell(item.tags),
      item.title,
      item.sourceKind,
      item.placeId ?? '',
      item.mapsUrl ?? '',
      String(item.lat),
      String(item.lng),
      item.localTimezone ?? '',
      item.openingHours ?? '',
      item.startTime,
      item.endTime,
      String(item.durationMin),
      item.notesMd,
      listToCell(item.photoUrls),
      item.availabilityStart ?? '',
      item.availabilityEnd ?? '',
      item.mode,
      String(item.isOptional),
      String(item.priority)
    ];
  }

  private legToRow(leg: TravelLeg): string[] {
    return [
      leg.legId,
      leg.dayId,
      leg.fromItemId,
      leg.toItemId,
      leg.mode,
      leg.departureDateTime,
      leg.arrivalDateTime,
      String(leg.durationMin),
      String(leg.distanceMeters),
      leg.routePathEncoded,
      String(leg.trafficAware),
      leg.calcStatus,
      leg.calculatedAt,
      leg.timezoneChangeLabel ?? ''
    ];
  }

  private historyToRow(event: HistoryEvent): string[] {
    return [
      event.eventId,
      event.timestamp,
      event.userEmail,
      event.entityType,
      event.entityId,
      event.action,
      event.field,
      event.oldValue,
      event.newValue,
      event.clientId
    ];
  }

  private metaToRow(meta: MetaRow): string[] {
    return [meta.schemaVersion, meta.appVersion, meta.lastUpdatedAt, meta.lastUpdatedBy];
  }

  private async request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Sheets API request failed (${response.status}): ${body}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
