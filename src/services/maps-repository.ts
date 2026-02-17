import type { TransportMode } from '../types/trip';

// ---------------------------------------------------------------------------
// Interfaces returned by MapsRepository methods
// ---------------------------------------------------------------------------

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  photoUrls?: string[];
  photoRef?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  businessStatus?: string;
  openNow?: boolean;
  weekdayText?: string[];
  website?: string;
  phoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUrl?: string;
  editorialSummary?: string;
}

export interface LegCalculation {
  durationMinutes: number;
  distanceMeters: number;
  routePathEncoded: string;
  departure: string;
  arrival: string;
}

export interface DistanceMatrixEntry {
  fromIndex: number;
  toIndex: number;
  durationMinutes: number;
  distanceMeters: number;
}

// ---------------------------------------------------------------------------
// Helper: wait for the google.maps global to be available
// ---------------------------------------------------------------------------

/**
 * Returns a promise that resolves once `google.maps` is defined on the
 * window object. If it is already available the promise resolves immediately.
 * Times out after `timeoutMs` (default 10 s) with a rejected promise.
 */
export function waitForGoogleMaps(timeoutMs = 10_000): Promise<typeof google.maps> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps) {
      resolve(google.maps);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps) {
        clearInterval(interval);
        resolve(google.maps);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Timed out waiting for google.maps to load'));
      }
    }, 100);
  });
}

// ---------------------------------------------------------------------------
// Lazy-initialised hidden PlacesService (needs a DOM element or a Map)
// ---------------------------------------------------------------------------

let _placesService: google.maps.places.PlacesService | null = null;
let _autocompleteService: google.maps.places.AutocompleteService | null = null;
let _directionsService: google.maps.DirectionsService | null = null;

function getAutocompleteService(): google.maps.places.AutocompleteService {
  if (!_autocompleteService) {
    _autocompleteService = new google.maps.places.AutocompleteService();
  }
  return _autocompleteService;
}

function getDirectionsService(): google.maps.DirectionsService {
  if (!_directionsService) {
    _directionsService = new google.maps.DirectionsService();
  }
  return _directionsService;
}

function getPlacesService(): google.maps.places.PlacesService {
  if (!_placesService) {
    // PlacesService requires a map or an attribution-container element.
    // We create a hidden div that lives for the lifetime of the app.
    const div = document.createElement('div');
    div.style.display = 'none';
    document.body.appendChild(div);
    _placesService = new google.maps.places.PlacesService(div);
  }
  return _placesService;
}

// ---------------------------------------------------------------------------
// Repository – thin wrapper around the Google Maps web-service APIs.
// ---------------------------------------------------------------------------

class MapsRepository {
  /**
   * Search for places matching `query` using the Places AutocompleteService,
   * then fetch details for each prediction.
   */
  async searchPlace(
    query: string,
    biasLocation?: { lat: number; lng: number },
  ): Promise<PlaceSearchResult[]> {
    await waitForGoogleMaps();

    const autocomplete = getAutocompleteService();

    const request: google.maps.places.AutocompletionRequest = {
      input: query,
      ...(biasLocation && {
        location: new google.maps.LatLng(biasLocation.lat, biasLocation.lng),
        radius: 50_000, // 50 km bias radius
      }),
    };

    // 1. Get autocomplete predictions
    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
      (resolve, reject) => {
        autocomplete.getPlacePredictions(request, (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            resolve(results);
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            reject(new Error(`AutocompleteService failed: ${status}`));
          }
        });
      },
    );

    if (predictions.length === 0) return [];

    // 2. Fetch details for each prediction (limit to first 5 to avoid quota spikes)
    const top = predictions.slice(0, 5);
    const results = await Promise.all(
      top.map((prediction) => this._fetchDetailsForPrediction(prediction)),
    );

    return results.filter((r): r is PlaceSearchResult => r !== null);
  }

  /**
   * Retrieve full place details for a single `placeId`.
   */
  async getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
    await waitForGoogleMaps();

    const service = getPlacesService();

    const detailsRequest: google.maps.places.PlaceDetailsRequest = {
      placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'types',
        'photos',
        'rating',
        'user_ratings_total',
        'opening_hours',
        'website',
        'formatted_phone_number',
        'international_phone_number',
        'price_level',
        'business_status',
        'editorial_summary',
        'url',
      ],
    };

    return new Promise<PlaceSearchResult | null>((resolve, reject) => {
      service.getDetails(detailsRequest, (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          resolve(this._placeResultToSearchResult(place));
        } else if (
          status === google.maps.places.PlacesServiceStatus.NOT_FOUND
        ) {
          resolve(null);
        } else {
          reject(new Error(`PlacesService.getDetails failed: ${status}`));
        }
      });
    });
  }

  async calculateLeg(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    mode: TransportMode,
    departureTime?: Date,
  ): Promise<LegCalculation | null> {
    try {
      await waitForGoogleMaps();

      const service = getDirectionsService();

      // Map our TransportMode string to the Google Maps TravelMode enum.
      // Note: 'flight' and 'other' don't have Google Maps equivalents, they fall back to driving.
      const travelModeMap: Record<TransportMode, google.maps.TravelMode> = {
        driving: google.maps.TravelMode.DRIVING,
        walking: google.maps.TravelMode.WALKING,
        bicycling: google.maps.TravelMode.BICYCLING,
        transit: google.maps.TravelMode.TRANSIT,
        flight: google.maps.TravelMode.DRIVING, // No flight routing in Google Maps, use driving as fallback
        other: google.maps.TravelMode.DRIVING,  // Custom modes use driving as fallback
      };

      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(from.lat, from.lng),
        destination: new google.maps.LatLng(to.lat, to.lng),
        travelMode: travelModeMap[mode] ?? google.maps.TravelMode.DRIVING,
        ...(departureTime && { drivingOptions: { departureTime } }),
        ...(departureTime &&
          mode === 'transit' && { transitOptions: { departureTime } }),
      };

      const result = await new Promise<google.maps.DirectionsResult>(
        (resolve, reject) => {
          service.route(request, (response, status) => {
            if (status === google.maps.DirectionsStatus.OK && response) {
              resolve(response);
            } else {
              reject(new Error(`DirectionsService failed: ${status}`));
            }
          });
        },
      );

      // Extract the first route / first leg from the result.
      const route = result.routes[0];
      const leg = route?.legs[0];
      if (!route || !leg) return null;

      const durationMinutes = Math.round((leg.duration?.value ?? 0) / 60);
      const distanceMeters = leg.distance?.value ?? 0;
      const routePathEncoded = route.overview_polyline ?? '';

      // Compute departure / arrival ISO strings.
      const departure = departureTime
        ? departureTime.toISOString()
        : new Date().toISOString();
      const arrivalDate = new Date(
        new Date(departure).getTime() + durationMinutes * 60_000,
      );
      const arrival = arrivalDate.toISOString();

      return {
        durationMinutes,
        distanceMeters,
        routePathEncoded,
        departure,
        arrival,
      };
    } catch (error) {
      console.error('calculateLeg failed:', error);
      return null;
    }
  }

  async getDistanceMatrix(
    origins: { lat: number; lng: number }[],
    destinations: { lat: number; lng: number }[],
    mode: TransportMode,
  ): Promise<DistanceMatrixEntry[]> {
    // Stub -- will use Distance Matrix API in Sprint 4
    console.log('getDistanceMatrix stub called', { origins, destinations, mode });
    return [];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async _fetchDetailsForPrediction(
    prediction: google.maps.places.AutocompletePrediction,
  ): Promise<PlaceSearchResult | null> {
    const service = getPlacesService();

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'types',
        'photos',
      ],
    };

    return new Promise<PlaceSearchResult | null>((resolve) => {
      service.getDetails(request, (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place
        ) {
          resolve(this._placeResultToSearchResult(place));
        } else {
          // Silently skip failed detail fetches inside search
          resolve(null);
        }
      });
    });
  }

  private _placeResultToSearchResult(
    place: google.maps.places.PlaceResult,
  ): PlaceSearchResult | null {
    const location = place.geometry?.location;
    if (!location) return null;

    const photoUrls = place.photos?.slice(0, 6).map((photo) =>
      photo.getUrl({ maxWidth: 1200, maxHeight: 900 }),
    ) ?? [];

    let openNow: boolean | undefined;
    if (typeof place.opening_hours?.isOpen === 'function') {
      try {
        openNow = place.opening_hours.isOpen();
      } catch {
        openNow = place.opening_hours.open_now;
      }
    } else {
      openNow = place.opening_hours?.open_now;
    }

    const editorialSummary = (
      place as google.maps.places.PlaceResult & {
        editorial_summary?: { overview?: string };
      }
    ).editorial_summary?.overview;

    return {
      placeId: place.place_id ?? '',
      name: place.name ?? '',
      address: place.formatted_address ?? '',
      lat: location.lat(),
      lng: location.lng(),
      types: place.types ?? [],
      photoUrls,
      photoRef: photoUrls[0],
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      businessStatus: place.business_status,
      openNow,
      weekdayText: place.opening_hours?.weekday_text,
      website: place.website,
      phoneNumber: place.formatted_phone_number,
      internationalPhoneNumber: place.international_phone_number,
      googleMapsUrl: place.url,
      editorialSummary,
    };
  }
}

export const mapsRepository = new MapsRepository();
