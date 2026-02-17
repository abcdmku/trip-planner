import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { DayFilter } from './components/DayFilter';
import { DetailCard } from './components/DetailCard';
import { InteractiveMap } from './components/InteractiveMap';
import { ItineraryPanel } from './components/ItineraryPanel';
import { SyncStatus } from './components/SyncStatus';
import { TimelineChart } from './components/TimelineChart';
import { TripControls } from './components/TripControls';
import { createSeedWorkspace } from './data/seed';
import { GoogleAuthService, type AuthSession } from './services/auth/googleAuth';
import { GoogleMapsRepository } from './services/maps/GoogleMapsRepository';
import { OptimizerService } from './services/optimizer/OptimizerService';
import { GoogleSheetsRepository } from './services/sheets/GoogleSheetsRepository';
import { LocalSheetsRepository } from './services/sheets/LocalSheetsRepository';
import type { SavePayload, SheetsRepository } from './services/sheets/SheetsRepository';
import type {
  ApiUsage,
  HistoryEvent,
  ItineraryItem,
  MetaRow,
  OptimizationMode,
  PlaceSearchResult,
  SyncState,
  TripWorkspace
} from './types/domain';
import { formatDistanceMeters, formatDurationMinutes } from './utils/format';
import { makeId } from './utils/ids';
import { parseSheetIdFromUrl } from './utils/sheetUrl';
import { combineDateAndTime, durationBetween, formatHumanTime, nowIso, toMinutes } from './utils/time';

const APP_VERSION = '0.1.0';
const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

type MobileTab = 'map' | 'timeline' | 'itinerary';

function normalizeSortOrder(items: ItineraryItem[], dayId: string): ItineraryItem[] {
  const target = items
    .filter((item) => item.dayId === dayId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId))
    .map((item, index) => ({
      ...item,
      sortOrder: index + 1
    }));

  const untouched = items.filter((item) => item.dayId !== dayId);
  return [...untouched, ...target];
}

function getDefaultDurationMin(type: ItineraryItem['type']): number {
  switch (type) {
    case 'food':
      return 60;
    case 'lodging':
      return 45;
    case 'activity':
      return 90;
    default:
      return 75;
  }
}

function parseScopes(input?: string): string[] {
  if (!input) {
    return DEFAULT_SCOPES;
  }

  const split = input
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  return split.length > 0 ? split : DEFAULT_SCOPES;
}

function createMeta(currentUserEmail: string): MetaRow {
  return {
    schemaVersion: '1.0.0',
    appVersion: APP_VERSION,
    lastUpdatedAt: nowIso(),
    lastUpdatedBy: currentUserEmail
  };
}

export default function App() {
  const oauthClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const scopes = parseScopes(import.meta.env.VITE_GOOGLE_SHEETS_SCOPES);

  const authService = useMemo(() => new GoogleAuthService(oauthClientId, scopes), [oauthClientId, scopes]);
  const mapsRepository = useMemo(() => new GoogleMapsRepository(mapsApiKey), [mapsApiKey]);
  const optimizer = useMemo(() => new OptimizerService(), []);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [workspace, setWorkspace] = useState<TripWorkspace | null>(
    authService.isConfigured() ? null : createSeedWorkspace('local-demo')
  );
  const [pendingHistoryEvents, setPendingHistoryEvents] = useState<HistoryEvent[]>([]);

  const [tripNameInput, setTripNameInput] = useState('My New Trip');
  const [timezoneInput, setTimezoneInput] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [optimizeMode, setOptimizeMode] = useState<OptimizationMode>('maximize_available_activities');

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState('Idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [mapsReady, setMapsReady] = useState<boolean>(false);
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ mapsCalls: 0, sheetsCalls: 0 });
  const [pendingLegRecalcDayIds, setPendingLegRecalcDayIds] = useState<string[]>([]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    if (selectedDayIds.length === 0) {
      setSelectedDayIds(workspace.days.map((day) => day.dayId));
    }
  }, [selectedDayIds.length, workspace]);

  useEffect(() => {
    if (!mapsRepository.isConfigured()) {
      return;
    }

    let cancelled = false;

    void mapsRepository
      .ensureLoaded()
      .then(() => {
        if (!cancelled) {
          setMapsReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize Google Maps.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapsRepository]);

  useEffect(() => {
    if (apiUsage.mapsCalls >= 120) {
      setWarningMessage('High Google Maps API usage this session. Use Refresh ETAs sparingly to control quota.');
    } else if (apiUsage.mapsCalls >= 60) {
      setWarningMessage('Maps API usage is rising. Consider batching edits before recalculating routes.');
    } else {
      setWarningMessage(null);
    }
  }, [apiUsage.mapsCalls]);

  const currentUserEmail = session?.user.email ?? 'local@trip-planner.app';

  const sheetRepository = useMemo<SheetsRepository | null>(() => {
    if (authService.isConfigured()) {
      if (!session) {
        return null;
      }

      return new GoogleSheetsRepository(session.accessToken, APP_VERSION);
    }

    return new LocalSheetsRepository();
  }, [authService, session]);

  const selectedItem = useMemo(() => {
    if (!workspace || !selectedItemId) {
      return undefined;
    }

    return workspace.items.find((item) => item.itemId === selectedItemId);
  }, [selectedItemId, workspace]);

  const selectedItemDay = useMemo(() => {
    if (!workspace || !selectedItem) {
      return undefined;
    }

    return workspace.days.find((day) => day.dayId === selectedItem.dayId);
  }, [selectedItem, workspace]);

  const visibleLegs = useMemo(() => {
    if (!workspace) {
      return [];
    }

    return workspace.legs
      .filter((leg) => selectedDayIds.includes(leg.dayId))
      .sort((a, b) => a.departureDateTime.localeCompare(b.departureDateTime));
  }, [selectedDayIds, workspace]);

  const queueHistory = useCallback(
    (event: Omit<HistoryEvent, 'eventId' | 'timestamp' | 'userEmail' | 'clientId'>): void => {
      setPendingHistoryEvents((current) => [
        ...current,
        {
          eventId: makeId('hist'),
          timestamp: nowIso(),
          userEmail: currentUserEmail,
          clientId: 'web',
          ...event
        }
      ]);
    },
    [currentUserEmail]
  );

  const requireRepository = useCallback((): SheetsRepository => {
    if (!sheetRepository) {
      throw new Error('Sign in with Google before loading or saving a sheet-backed trip.');
    }

    return sheetRepository;
  }, [sheetRepository]);

  const recomputeLegsForDays = useCallback(
    async (dayIds: string[]): Promise<void> => {
      if (!workspace || dayIds.length === 0) {
        return;
      }

      if (!mapsRepository.isConfigured()) {
        setWarningMessage('Maps API key missing. ETA calculation and map routing are disabled.');
        return;
      }

      await mapsRepository.ensureLoaded();
      setMapsReady(true);

      const nextLegs = workspace.legs.filter((leg) => !dayIds.includes(leg.dayId));
      let mapsCalls = 0;

      for (const dayId of dayIds) {
        const day = workspace.days.find((entry) => entry.dayId === dayId);
        if (!day) {
          continue;
        }

        const dayItems = workspace.items
          .filter((entry) => entry.dayId === dayId)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

        for (let index = 0; index < dayItems.length - 1; index += 1) {
          const from = dayItems[index];
          const to = dayItems[index + 1];

          try {
            const departureDateTimeIso = combineDateAndTime(day.date, from.endTime);
            const estimate = await mapsRepository.calculateLeg({
              origin: { lat: from.lat, lng: from.lng },
              destination: { lat: to.lat, lng: to.lng },
              mode: to.mode || workspace.trip.defaultMode,
              departureDateTimeIso,
              tripTimezone: workspace.trip.baseTimezone
            });

            mapsCalls += 1;

            nextLegs.push({
              legId: makeId('leg'),
              dayId,
              fromItemId: from.itemId,
              toItemId: to.itemId,
              mode: to.mode,
              departureDateTime: departureDateTimeIso,
              arrivalDateTime: estimate.arrivalDateTime,
              durationMin: estimate.durationMin,
              distanceMeters: estimate.distanceMeters,
              routePathEncoded: estimate.routePathEncoded,
              trafficAware: to.mode === 'DRIVING',
              calcStatus: 'ok',
              calculatedAt: nowIso(),
              timezoneChangeLabel: estimate.timezoneChangeLabel
            });
          } catch (error) {
            nextLegs.push({
              legId: makeId('leg'),
              dayId,
              fromItemId: from.itemId,
              toItemId: to.itemId,
              mode: to.mode,
              departureDateTime: combineDateAndTime(day.date, from.endTime),
              arrivalDateTime: combineDateAndTime(day.date, to.startTime),
              durationMin: Math.max(1, durationBetween(from.endTime, to.startTime)),
              distanceMeters: 0,
              routePathEncoded: '',
              trafficAware: false,
              calcStatus: 'error',
              calculatedAt: nowIso(),
              timezoneChangeLabel: undefined
            });

            setWarningMessage(
              error instanceof Error
                ? `Unable to recalculate one or more legs: ${error.message}`
                : 'Leg recalculation failed for one or more routes.'
            );
          }
        }
      }

      setApiUsage((current) => ({ ...current, mapsCalls: current.mapsCalls + mapsCalls }));
      setWorkspace((current) => (current ? { ...current, legs: nextLegs } : current));
      queueHistory({
        entityType: 'leg',
        entityId: dayIds.join(','),
        action: 'update',
        field: 'legs',
        oldValue: '',
        newValue: 'recalculated'
      });
    },
    [mapsRepository, queueHistory, workspace]
  );

  useEffect(() => {
    if (pendingLegRecalcDayIds.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const dayIds = [...pendingLegRecalcDayIds];
      setPendingLegRecalcDayIds([]);
      void recomputeLegsForDays(dayIds);
    }, 900);

    return () => clearTimeout(timer);
  }, [pendingLegRecalcDayIds, recomputeLegsForDays]);

  const enqueueLegRecalc = useCallback((dayId: string): void => {
    setPendingLegRecalcDayIds((current) => {
      if (current.includes(dayId)) {
        return current;
      }
      return [...current, dayId];
    });
  }, []);

  const handleSignIn = useCallback(async (): Promise<void> => {
    try {
      setErrorMessage(null);
      const nextSession = await authService.signIn();
      setSession(nextSession);
      setSyncMessage('Signed in with Google.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
    }
  }, [authService]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    if (!session) {
      return;
    }

    await authService.signOut(session.accessToken);
    setSession(null);
    setWorkspace(null);
    setPendingHistoryEvents([]);
    setSelectedDayIds([]);
    setSelectedItemId(undefined);
    setSyncMessage('Signed out.');
  }, [authService, session]);

  const handleCreateTrip = useCallback(async (): Promise<void> => {
    try {
      setErrorMessage(null);
      setSyncState('syncing');
      setSyncMessage('Creating spreadsheet template...');

      const repository = requireRepository();
      const nextWorkspace = await repository.createWorkspace({
        tripName: tripNameInput.trim() || 'Untitled Trip',
        timezone: timezoneInput || Intl.DateTimeFormat().resolvedOptions().timeZone,
        actorEmail: currentUserEmail
      });

      setApiUsage((current) => ({ ...current, sheetsCalls: current.sheetsCalls + 1 }));
      setWorkspace(nextWorkspace);
      setSelectedDayIds(nextWorkspace.days.map((day) => day.dayId));
      setSelectedItemId(nextWorkspace.items[0]?.itemId);
      setPendingHistoryEvents([]);
      setSheetUrlInput(`https://docs.google.com/spreadsheets/d/${nextWorkspace.trip.sheetId}/edit`);
      setSyncState('idle');
      setSyncMessage('Trip sheet created.');
      setLastSyncedAt(formatHumanTime(nowIso()));
    } catch (error) {
      setSyncState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create trip sheet.');
    }
  }, [currentUserEmail, requireRepository, timezoneInput, tripNameInput]);

  const handleLoadTrip = useCallback(async (): Promise<void> => {
    try {
      setErrorMessage(null);
      setSyncState('syncing');
      setSyncMessage('Loading trip from Google Sheet...');

      const repository = requireRepository();
      const sheetId = parseSheetIdFromUrl(sheetUrlInput);
      if (!sheetId) {
        throw new Error('Please paste a valid Google Sheet URL or sheet ID.');
      }

      const nextWorkspace = await repository.loadWorkspace(sheetId);
      setApiUsage((current) => ({ ...current, sheetsCalls: current.sheetsCalls + 1 }));
      setWorkspace(nextWorkspace);
      setSelectedDayIds(nextWorkspace.days.map((day) => day.dayId));
      setSelectedItemId(nextWorkspace.items[0]?.itemId);
      setPendingHistoryEvents([]);
      setTripNameInput(nextWorkspace.trip.name);
      setTimezoneInput(nextWorkspace.trip.baseTimezone);
      setSyncState('idle');
      setSyncMessage('Trip loaded.');
      setLastSyncedAt(formatHumanTime(nowIso()));
    } catch (error) {
      setSyncState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load trip sheet.');
    }
  }, [requireRepository, sheetUrlInput]);

  const handleSaveTrip = useCallback(async (): Promise<void> => {
    if (!workspace) {
      return;
    }

    try {
      setSyncState('syncing');
      setSyncMessage('Saving workspace to sheet...');

      const repository = requireRepository();
      const payload: SavePayload = {
        trip: workspace.trip,
        days: workspace.days,
        items: workspace.items,
        legs: workspace.legs,
        meta: createMeta(currentUserEmail),
        historyEvents: pendingHistoryEvents
      };

      await repository.saveWorkspace(workspace.trip.sheetId, payload);
      setApiUsage((current) => ({ ...current, sheetsCalls: current.sheetsCalls + 1 }));
      setWorkspace((current) =>
        current
          ? {
              ...current,
              meta: payload.meta,
              history: [...current.history, ...pendingHistoryEvents]
            }
          : current
      );
      setPendingHistoryEvents([]);
      setSyncState('idle');
      setSyncMessage('Saved to Google Sheet.');
      setLastSyncedAt(formatHumanTime(nowIso()));
    } catch (error) {
      setSyncState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save workspace.');
    }
  }, [currentUserEmail, pendingHistoryEvents, requireRepository, workspace]);

  const handleSearchPlaces = useCallback(
    async (query: string): Promise<PlaceSearchResult[]> => {
      if (!query.trim()) {
        return [];
      }

      if (!mapsRepository.isConfigured()) {
        throw new Error('Google Maps API key is required for place search.');
      }

      await mapsRepository.ensureLoaded();
      setMapsReady(true);
      const results = await mapsRepository.searchPlaces(query);
      setApiUsage((current) => ({ ...current, mapsCalls: current.mapsCalls + 1 }));
      return results;
    },
    [mapsRepository]
  );

  const appendPlacesToDay = useCallback(
    async (dayId: string, places: PlaceSearchResult[]): Promise<void> => {
      if (!workspace || places.length === 0) {
        return;
      }

      const day = workspace.days.find((entry) => entry.dayId === dayId);
      if (!day) {
        return;
      }

      const additions: ItineraryItem[] = [];
      const existingDayItems = workspace.items
        .filter((entry) => entry.dayId === dayId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

      let currentStartMinutes = existingDayItems.length
        ? toMinutes(existingDayItems[existingDayItems.length - 1].endTime)
        : toMinutes(day.dayStart);

      for (const [index, place] of places.entries()) {
        const durationMin = getDefaultDurationMin('poi');
        const startTime = `${String(Math.floor(currentStartMinutes / 60) % 24).padStart(2, '0')}:${String(
          currentStartMinutes % 60
        ).padStart(2, '0')}`;
        const endMinutes = currentStartMinutes + durationMin;
        const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(
          endMinutes % 60
        ).padStart(2, '0')}`;

        let localTimezone: string | undefined;
        if (mapsRepository.isConfigured()) {
          try {
            localTimezone = await mapsRepository.lookupTimezone({
              lat: place.lat,
              lng: place.lng,
              timestampMs: Date.now()
            });
            setApiUsage((current) => ({ ...current, mapsCalls: current.mapsCalls + 1 }));
          } catch {
            localTimezone = undefined;
          }
        }

        const item: ItineraryItem = {
          itemId: makeId('item'),
          dayId,
          sortOrder: existingDayItems.length + additions.length + 1,
          type: 'poi',
          tags: ['maps'],
          title: place.title,
          sourceKind: place.mapsUrl ? 'maps_url' : 'google_place',
          placeId: place.placeId,
          mapsUrl: place.mapsUrl,
          lat: place.lat,
          lng: place.lng,
          localTimezone,
          openingHours: place.openingHours,
          startTime,
          endTime,
          durationMin,
          notesMd: '',
          photoUrls: [],
          availabilityStart: undefined,
          availabilityEnd: undefined,
          mode: workspace.trip.defaultMode,
          isOptional: false,
          priority: Math.max(10, 80 - index * 10)
        };

        additions.push(item);
        currentStartMinutes = endMinutes;
      }

      setWorkspace((current) =>
        current
          ? {
              ...current,
              items: [...current.items, ...additions]
            }
          : current
      );

      for (const item of additions) {
        queueHistory({
          entityType: 'item',
          entityId: item.itemId,
          action: 'create',
          field: 'item',
          oldValue: '',
          newValue: item.title
        });
      }

      setSelectedItemId(additions[0]?.itemId);
      enqueueLegRecalc(dayId);
    },
    [enqueueLegRecalc, mapsRepository, queueHistory, workspace]
  );

  const handleAddPlaceToDay = useCallback(
    (dayId: string, place: PlaceSearchResult): void => {
      void appendPlacesToDay(dayId, [place]);
    },
    [appendPlacesToDay]
  );

  const handleImportSavedPlaces = useCallback(
    async (dayId: string, lines: string[]): Promise<void> => {
      if (!mapsRepository.isConfigured()) {
        throw new Error('Google Maps API key is required for URL imports.');
      }

      await mapsRepository.ensureLoaded();
      setMapsReady(true);
      const places = await mapsRepository.resolveSavedPlaces(lines);
      setApiUsage((current) => ({ ...current, mapsCalls: current.mapsCalls + Math.max(1, places.length) }));
      await appendPlacesToDay(dayId, places);
    },
    [appendPlacesToDay, mapsRepository]
  );

  const handleAddManualItem = useCallback(
    (dayId: string): void => {
      if (!workspace) {
        return;
      }

      const day = workspace.days.find((entry) => entry.dayId === dayId);
      if (!day) {
        return;
      }

      const dayItems = workspace.items
        .filter((entry) => entry.dayId === dayId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

      const lastItem = dayItems[dayItems.length - 1];
      const durationMin = getDefaultDurationMin('activity');
      const startMinutes = lastItem ? toMinutes(lastItem.endTime) : toMinutes(day.dayStart);
      const endMinutes = startMinutes + durationMin;

      const startTime = `${String(Math.floor(startMinutes / 60) % 24).padStart(2, '0')}:${String(
        startMinutes % 60
      ).padStart(2, '0')}`;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(
        endMinutes % 60
      ).padStart(2, '0')}`;

      const item: ItineraryItem = {
        itemId: makeId('item'),
        dayId,
        sortOrder: dayItems.length + 1,
        type: 'activity',
        tags: ['manual'],
        title: 'Custom Activity',
        sourceKind: 'manual',
        lat: lastItem?.lat ?? 37.773972,
        lng: lastItem?.lng ?? -122.431297,
        startTime,
        endTime,
        durationMin,
        notesMd: '',
        photoUrls: [],
        mode: workspace.trip.defaultMode,
        isOptional: false,
        priority: 50
      };

      setWorkspace((current) =>
        current
          ? {
              ...current,
              items: [...current.items, item]
            }
          : current
      );

      queueHistory({
        entityType: 'item',
        entityId: item.itemId,
        action: 'create',
        field: 'item',
        oldValue: '',
        newValue: item.title
      });

      setSelectedItemId(item.itemId);
      enqueueLegRecalc(dayId);
    },
    [enqueueLegRecalc, queueHistory, workspace]
  );

  const handleUpdateItem = useCallback(
    (itemId: string, patch: Partial<ItineraryItem>): void => {
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        const existing = current.items.find((entry) => entry.itemId === itemId);
        if (!existing) {
          return current;
        }

        const merged: ItineraryItem = {
          ...existing,
          ...patch
        };

        if ((patch.startTime || patch.endTime) && !patch.durationMin) {
          merged.durationMin = Math.max(5, durationBetween(merged.startTime, merged.endTime));
        }

        const items = current.items.map((entry) => (entry.itemId === itemId ? merged : entry));

        return {
          ...current,
          items
        };
      });

      queueHistory({
        entityType: 'item',
        entityId: itemId,
        action: 'update',
        field: Object.keys(patch).join(',') || 'item',
        oldValue: '',
        newValue: JSON.stringify(patch)
      });

      const dayId = workspace?.items.find((entry) => entry.itemId === itemId)?.dayId;
      if (dayId) {
        enqueueLegRecalc(dayId);
      }
    },
    [enqueueLegRecalc, queueHistory, workspace?.items]
  );

  const handleMoveItem = useCallback(
    (itemId: string, direction: 'up' | 'down'): void => {
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        const currentItem = current.items.find((item) => item.itemId === itemId);
        if (!currentItem) {
          return current;
        }

        const dayItems = current.items
          .filter((item) => item.dayId === currentItem.dayId)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

        const index = dayItems.findIndex((item) => item.itemId === itemId);
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || swapIndex < 0 || swapIndex >= dayItems.length) {
          return current;
        }

        const nextDayItems = [...dayItems];
        const temp = nextDayItems[index];
        nextDayItems[index] = nextDayItems[swapIndex];
        nextDayItems[swapIndex] = temp;

        const nextItems = current.items.map((item) => {
          if (item.dayId !== currentItem.dayId) {
            return item;
          }

          const reordered = nextDayItems.find((entry) => entry.itemId === item.itemId);
          if (!reordered) {
            return item;
          }

          return {
            ...item,
            sortOrder: nextDayItems.indexOf(reordered) + 1
          };
        });

        return {
          ...current,
          items: normalizeSortOrder(nextItems, currentItem.dayId)
        };
      });

      queueHistory({
        entityType: 'item',
        entityId: itemId,
        action: 'reorder',
        field: 'sortOrder',
        oldValue: '',
        newValue: direction
      });

      const dayId = workspace?.items.find((entry) => entry.itemId === itemId)?.dayId;
      if (dayId) {
        enqueueLegRecalc(dayId);
      }
    },
    [enqueueLegRecalc, queueHistory, workspace?.items]
  );

  const handleDeleteItem = useCallback(
    (itemId: string): void => {
      setWorkspace((current) => {
        if (!current) {
          return current;
        }

        const target = current.items.find((entry) => entry.itemId === itemId);
        if (!target) {
          return current;
        }

        const items = current.items.filter((entry) => entry.itemId !== itemId);
        return {
          ...current,
          items: normalizeSortOrder(items, target.dayId),
          legs: current.legs.filter((leg) => leg.fromItemId !== itemId && leg.toItemId !== itemId)
        };
      });

      queueHistory({
        entityType: 'item',
        entityId: itemId,
        action: 'delete',
        field: 'item',
        oldValue: '',
        newValue: ''
      });

      if (selectedItemId === itemId) {
        setSelectedItemId(undefined);
      }

      const dayId = workspace?.items.find((entry) => entry.itemId === itemId)?.dayId;
      if (dayId) {
        enqueueLegRecalc(dayId);
      }
    },
    [enqueueLegRecalc, queueHistory, selectedItemId, workspace?.items]
  );

  const handleToggleDayFilter = useCallback((dayId: string): void => {
    setSelectedDayIds((current) => {
      if (current.includes(dayId)) {
        const next = current.filter((entry) => entry !== dayId);
        return next.length > 0 ? next : current;
      }

      return [...current, dayId];
    });
  }, []);

  const handleOptimizeVisibleDays = useCallback((): void => {
    if (!workspace) {
      return;
    }

    const droppedTitles: string[] = [];
    const conflicts: string[] = [];

    const nextItems = [...workspace.items];

    for (const dayId of selectedDayIds) {
      const day = workspace.days.find((entry) => entry.dayId === dayId);
      if (!day) {
        continue;
      }

      const dayItems = nextItems
        .filter((entry) => entry.dayId === dayId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));

      const result = optimizer.optimizeDay(dayItems, day, optimizeMode);

      for (const droppedId of result.droppedOptionalItemIds) {
        const droppedItem = nextItems.find((entry) => entry.itemId === droppedId);
        if (droppedItem) {
          droppedTitles.push(droppedItem.title);
        }
      }

      conflicts.push(...result.conflicts);

      const dayItemIdSet = new Set(dayItems.map((entry) => entry.itemId));
      const droppedSet = new Set(result.droppedOptionalItemIds);

      const keptItems = nextItems.filter(
        (entry) => !(dayItemIdSet.has(entry.itemId) && droppedSet.has(entry.itemId))
      );
      const reordered = result.orderedItems.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));

      nextItems.length = 0;
      nextItems.push(...keptItems.filter((entry) => entry.dayId !== dayId), ...reordered);
    }

    setWorkspace((current) =>
      current
        ? {
            ...current,
            items: nextItems
          }
        : current
    );

    queueHistory({
      entityType: 'item',
      entityId: selectedDayIds.join(','),
      action: 'optimize',
      field: optimizeMode,
      oldValue: '',
      newValue: JSON.stringify({ droppedTitles, conflicts })
    });

    if (droppedTitles.length > 0) {
      setWarningMessage(`Optimizer dropped optional stops: ${droppedTitles.join(', ')}`);
    } else if (conflicts.length > 0) {
      setWarningMessage(`Optimizer conflicts: ${conflicts.join(' | ')}`);
    } else {
      setWarningMessage('Optimizer completed with no conflicts.');
    }

    void recomputeLegsForDays(selectedDayIds);
  }, [optimizeMode, optimizer, queueHistory, recomputeLegsForDays, selectedDayIds, workspace]);

  const handleRecalcVisibleLegs = useCallback((): void => {
    void recomputeLegsForDays(selectedDayIds);
  }, [recomputeLegsForDays, selectedDayIds]);

  const timelineItems = workspace?.items ?? [];
  const timelineDays = workspace?.days ?? [];
  const isBusy = syncState === 'syncing';

  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="mx-auto max-w-[1700px] px-3 py-4 sm:px-4 lg:px-6">
        <header className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Trip Planner V1</p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                Google Maps + Google Sheets Itinerary Studio
              </h1>
            </div>
            <AuthPanel
              configured={authService.isConfigured()}
              signedIn={Boolean(session)}
              userName={session?.user.name}
              userEmail={session?.user.email}
              onSignIn={() => {
                void handleSignIn();
              }}
              onSignOut={() => {
                void handleSignOut();
              }}
            />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <TripControls
              tripNameInput={tripNameInput}
              timezoneInput={timezoneInput}
              loadSheetUrl={sheetUrlInput}
              optimizeMode={optimizeMode}
              onTripNameChange={setTripNameInput}
              onTimezoneChange={setTimezoneInput}
              onLoadSheetUrlChange={setSheetUrlInput}
              onCreateTrip={() => {
                void handleCreateTrip();
              }}
              onLoadTrip={() => {
                void handleLoadTrip();
              }}
              onSaveTrip={() => {
                void handleSaveTrip();
              }}
              onRecalcVisibleLegs={handleRecalcVisibleLegs}
              onOptimizeVisibleDays={handleOptimizeVisibleDays}
              onOptimizeModeChange={setOptimizeMode}
              disabled={isBusy || (!sheetRepository && authService.isConfigured())}
            />

            {workspace ? (
              <DayFilter
                days={workspace.days}
                selectedDayIds={selectedDayIds}
                onToggleDay={handleToggleDayFilter}
              />
            ) : null}

            <SyncStatus state={syncState} message={syncMessage} lastSyncedAt={lastSyncedAt} />

            {warningMessage ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                {warningMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
              <p className="mb-1 uppercase tracking-[0.12em] text-slate-500">Session API Usage</p>
              <p>Maps calls: {apiUsage.mapsCalls}</p>
              <p>Sheets calls: {apiUsage.sheetsCalls}</p>
            </div>

            {visibleLegs.length > 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs">
                <p className="mb-2 uppercase tracking-[0.12em] text-slate-500">Visible Legs</p>
                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {visibleLegs.map((leg) => (
                    <div key={leg.legId} className="rounded border border-slate-700 p-2">
                      <p className="font-semibold text-slate-200">{leg.mode}</p>
                      <p className="text-slate-400">
                        {formatDurationMinutes(leg.durationMin)} - {formatDistanceMeters(leg.distanceMeters)}
                      </p>
                      {leg.timezoneChangeLabel ? (
                        <p className="text-amber-300">TZ: {leg.timezoneChangeLabel}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <main className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-2 lg:hidden">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className={`rounded px-2 py-2 ${mobileTab === 'map' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('timeline')}
                  className={`rounded px-2 py-2 ${mobileTab === 'timeline' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('itinerary')}
                  className={`rounded px-2 py-2 ${mobileTab === 'itinerary' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                >
                  Itinerary
                </button>
              </div>
            </div>

            {workspace ? (
              <>
                <div className={`${mobileTab === 'map' ? 'block' : 'hidden'} lg:block`}>
                  <InteractiveMap
                    enabled={mapsReady && mapsRepository.isConfigured()}
                    days={timelineDays}
                    selectedDayIds={selectedDayIds}
                    items={timelineItems}
                    legs={workspace.legs}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                  />
                </div>

                <div className={`${mobileTab === 'timeline' ? 'block' : 'hidden'} lg:block`}>
                  <TimelineChart
                    days={timelineDays}
                    items={timelineItems}
                    selectedDayIds={selectedDayIds}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    onItemTimeChange={(itemId, startTime, endTime) => {
                      handleUpdateItem(itemId, { startTime, endTime });
                    }}
                  />
                </div>

                <div className={`${mobileTab === 'itinerary' ? 'block' : 'hidden'} lg:block`}>
                  <ItineraryPanel
                    days={timelineDays}
                    items={timelineItems}
                    selectedDayIds={selectedDayIds}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    onSearchPlaces={handleSearchPlaces}
                    onAddPlaceToDay={handleAddPlaceToDay}
                    onAddManualItem={handleAddManualItem}
                    onImportSavedPlaces={handleImportSavedPlaces}
                    onMoveItem={handleMoveItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </div>

                <DetailCard
                  item={selectedItem}
                  day={selectedItemDay}
                  tripTimezone={workspace.trip.baseTimezone}
                  onUpdate={handleUpdateItem}
                />
              </>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                Create a new trip sheet or load an existing sheet URL to start planning.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
