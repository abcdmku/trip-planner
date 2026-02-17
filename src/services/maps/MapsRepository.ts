import type { LegEstimate, PlaceSearchResult, TransportMode } from '../../types/domain';

export interface MapsRepository {
  isConfigured(): boolean;
  ensureLoaded(): Promise<void>;
  searchPlaces(query: string): Promise<PlaceSearchResult[]>;
  resolveSavedPlaces(lines: string[]): Promise<PlaceSearchResult[]>;
  calculateLeg(input: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: TransportMode;
    departureDateTimeIso: string;
    tripTimezone: string;
  }): Promise<LegEstimate>;
  lookupTimezone(input: { lat: number; lng: number; timestampMs: number }): Promise<string | undefined>;
}
