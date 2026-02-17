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

export interface SavePayload {
  trip: Trip;
  days: TripDay[];
  items: ItineraryItem[];
  legs: TravelLeg[];
  meta: MetaRow;
  historyEvents: HistoryEvent[];
}

export interface SheetsRepository {
  createWorkspace(input: {
    tripName: string;
    timezone: string;
    actorEmail: string;
  }): Promise<TripWorkspace>;

  validateTemplate(sheetId: string): Promise<TemplateValidationResult>;

  loadWorkspace(sheetId: string): Promise<TripWorkspace>;

  saveWorkspace(sheetId: string, payload: SavePayload): Promise<void>;
}
