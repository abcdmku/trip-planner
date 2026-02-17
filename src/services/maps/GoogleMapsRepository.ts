import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { LegEstimate, PlaceSearchResult, TransportMode } from '../../types/domain';
import type { MapsRepository } from './MapsRepository';

function toTravelMode(mode: TransportMode): google.maps.TravelMode {
  switch (mode) {
    case 'WALKING':
      return google.maps.TravelMode.WALKING;
    case 'BICYCLING':
      return google.maps.TravelMode.BICYCLING;
    case 'TRANSIT':
      return google.maps.TravelMode.TRANSIT;
    default:
      return google.maps.TravelMode.DRIVING;
  }
}

function extractPlaceIdFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const queryPlaceId = parsed.searchParams.get('query_place_id');
    if (queryPlaceId) {
      return queryPlaceId;
    }

    const query = parsed.searchParams.get('q') ?? '';
    const placeIdMatch = query.match(/place_id:([a-zA-Z0-9-_]+)/);
    if (placeIdMatch?.[1]) {
      return placeIdMatch[1];
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function extractSearchTextFromMapsUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams.get('query');
    if (query) {
      return query;
    }

    const pathMatch = parsed.pathname.match(/\/place\/([^/]+)/);
    if (pathMatch?.[1]) {
      return decodeURIComponent(pathMatch[1].replace(/\+/g, ' '));
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export class GoogleMapsRepository implements MapsRepository {
  private readonly apiKey: string;
  private hiddenMapElement: HTMLDivElement | null = null;
  private map: google.maps.Map | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private static optionsInitialized = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    if (apiKey && !GoogleMapsRepository.optionsInitialized) {
      setOptions({
        key: apiKey,
        v: 'weekly'
      });
      GoogleMapsRepository.optionsInitialized = true;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async ensureLoaded(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is missing.');
    }

    await importLibrary('maps');
    await importLibrary('places');
    await importLibrary('geometry');

    if (!this.hiddenMapElement) {
      const element = document.createElement('div');
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.position = 'absolute';
      element.style.opacity = '0';
      element.style.pointerEvents = 'none';
      document.body.appendChild(element);
      this.hiddenMapElement = element;
    }

    if (!this.map) {
      this.map = new google.maps.Map(this.hiddenMapElement, {
        center: { lat: 37.773972, lng: -122.431297 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false
      });
    }

    if (!this.placesService) {
      this.placesService = new google.maps.places.PlacesService(this.map);
    }

    if (!this.directionsService) {
      this.directionsService = new google.maps.DirectionsService();
    }
  }

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    await this.ensureLoaded();

    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error('Places service unavailable.'));
        return;
      }

      this.placesService.textSearch(
        { query },
        (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
            return;
          }

          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            reject(new Error(`Google Places search failed (${status}).`));
            return;
          }

          const mapped = results
            .filter((entry) => entry.geometry?.location)
            .slice(0, 8)
            .map((entry) => {
              const loc = entry.geometry!.location!;
              return {
                placeId: entry.place_id,
                title: entry.name ?? query,
                lat: loc.lat(),
                lng: loc.lng(),
                mapsUrl: entry.place_id
                  ? `https://www.google.com/maps/search/?api=1&query_place_id=${entry.place_id}`
                  : undefined,
                openingHours: entry.opening_hours?.weekday_text?.join('; ')
              } satisfies PlaceSearchResult;
            });

          resolve(mapped);
        }
      );
    });
  }

  async resolveSavedPlaces(lines: string[]): Promise<PlaceSearchResult[]> {
    await this.ensureLoaded();

    const results: PlaceSearchResult[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const urlMatch = line.match(/https?:\/\/\S+/);
      const maybeUrl = urlMatch?.[0];
      const label = maybeUrl ? line.replace(maybeUrl, '').trim() : line;

      if (!maybeUrl) {
        const fromText = await this.searchPlaces(line);
        if (fromText[0]) {
          results.push({
            ...fromText[0],
            title: label || fromText[0].title
          });
        }
        continue;
      }

      const placeId = extractPlaceIdFromUrl(maybeUrl);
      if (placeId) {
        const detailed = await this.getPlaceById(placeId);
        if (detailed) {
          results.push({
            ...detailed,
            title: label || detailed.title,
            mapsUrl: maybeUrl
          });
          continue;
        }
      }

      const queryText = label || extractSearchTextFromMapsUrl(maybeUrl) || maybeUrl;
      const searched = await this.searchPlaces(queryText);
      if (searched[0]) {
        results.push({
          ...searched[0],
          title: label || searched[0].title,
          mapsUrl: maybeUrl
        });
      }
    }

    return results;
  }

  async calculateLeg(input: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: TransportMode;
    departureDateTimeIso: string;
    tripTimezone: string;
  }): Promise<LegEstimate> {
    await this.ensureLoaded();

    const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      if (!this.directionsService) {
        reject(new Error('Directions service unavailable.'));
        return;
      }

      const departure = new Date(input.departureDateTimeIso);

      this.directionsService.route(
        {
          origin: input.origin,
          destination: input.destination,
          travelMode: toTravelMode(input.mode),
          drivingOptions:
            input.mode === 'DRIVING'
              ? {
                  departureTime: departure,
                  trafficModel: google.maps.TrafficModel.BEST_GUESS
                }
              : undefined,
          transitOptions:
            input.mode === 'TRANSIT'
              ? {
                  departureTime: departure
                }
              : undefined
        },
        (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
          if (status !== google.maps.DirectionsStatus.OK || !result) {
            reject(new Error(`Directions request failed (${status}).`));
            return;
          }

          resolve(result);
        }
      );
    });

    const route = response.routes[0];
    const leg = route.legs[0];

    const durationSeconds = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0;
    const distanceMeters = leg.distance?.value ?? 0;
    const arrivalDateTime = new Date(new Date(input.departureDateTimeIso).getTime() + durationSeconds * 1000).toISOString();

    const routePathEncoded =
      typeof route.overview_polyline === 'string' && route.overview_polyline.length > 0
        ? route.overview_polyline
      : google.maps.geometry.encoding.encodePath(route.overview_path);

    const destinationTimezone = await this.lookupTimezone({
      lat: input.destination.lat,
      lng: input.destination.lng,
      timestampMs: Date.now()
    });

    let timezoneChangeLabel: string | undefined;
    if (destinationTimezone && destinationTimezone !== input.tripTimezone) {
      timezoneChangeLabel = `${input.tripTimezone} -> ${destinationTimezone}`;
    }

    return {
      durationMin: Math.max(1, Math.round(durationSeconds / 60)),
      distanceMeters,
      routePathEncoded,
      arrivalDateTime,
      timezoneChangeLabel
    };
  }

  async lookupTimezone(input: { lat: number; lng: number; timestampMs: number }): Promise<string | undefined> {
    if (!this.apiKey) {
      return undefined;
    }

    const timestampSeconds = Math.floor(input.timestampMs / 1000);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${input.lat},${input.lng}&timestamp=${timestampSeconds}&key=${this.apiKey}`
    );

    if (!response.ok) {
      return undefined;
    }

    const body = (await response.json()) as { status: string; timeZoneId?: string };
    if (body.status !== 'OK') {
      return undefined;
    }

    return body.timeZoneId;
  }

  private async getPlaceById(placeId: string): Promise<PlaceSearchResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error('Places service unavailable.'));
        return;
      }

      this.placesService.getDetails(
        {
          placeId,
          fields: ['name', 'geometry', 'opening_hours', 'place_id']
        },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.NOT_FOUND || !place) {
            resolve(null);
            return;
          }

          if (status !== google.maps.places.PlacesServiceStatus.OK || !place.geometry?.location) {
            reject(new Error(`Place details request failed (${status}).`));
            return;
          }

          resolve({
            placeId,
            title: place.name ?? 'Google Place',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            openingHours: place.opening_hours?.weekday_text?.join('; '),
            mapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`
          });
        }
      );
    });
  }
}
