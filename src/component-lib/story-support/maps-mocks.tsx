import { useEffect, type ReactNode } from 'react';
import { mapsRepository, type LegCalculation, type PlaceSearchResult } from '@/services/maps-repository';

export interface MockMapsRepositoryOptions {
  searchResults?: PlaceSearchResult[];
  placeDetailsById?: Record<string, PlaceSearchResult>;
  legCalculation?: LegCalculation | null;
}

export function MockMapsRepositoryBoundary({
  children,
  options,
}: {
  children: ReactNode;
  options: MockMapsRepositoryOptions;
}) {
  useEffect(() => {
    const originalSearchPlace = mapsRepository.searchPlace.bind(mapsRepository);
    const originalGetPlaceDetails = mapsRepository.getPlaceDetails.bind(mapsRepository);
    const originalCalculateLeg = mapsRepository.calculateLeg.bind(mapsRepository);

    mapsRepository.searchPlace = async (query: string) => {
      const normalized = query.trim().toLowerCase();
      if (normalized.length < 2) return [];
      return (options.searchResults ?? []).filter((place) => {
        const haystack = `${place.name} ${place.address}`.toLowerCase();
        return haystack.includes(normalized);
      });
    };

    mapsRepository.getPlaceDetails = async (placeId: string) => {
      if (options.placeDetailsById?.[placeId]) {
        return options.placeDetailsById[placeId];
      }
      return (options.searchResults ?? []).find((place) => place.placeId === placeId) ?? null;
    };

    mapsRepository.calculateLeg = async () => options.legCalculation ?? null;

    return () => {
      mapsRepository.searchPlace = originalSearchPlace;
      mapsRepository.getPlaceDetails = originalGetPlaceDetails;
      mapsRepository.calculateLeg = originalCalculateLeg;
    };
  }, [options]);

  return <>{children}</>;
}
