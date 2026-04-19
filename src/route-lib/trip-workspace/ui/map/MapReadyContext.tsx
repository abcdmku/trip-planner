import { createContext, useContext } from 'react';

export interface MapReadyContextValue {
  isMapReady: boolean;
}

export const MapReadyContext = createContext<MapReadyContextValue>({ isMapReady: false });

export function useMapReady(): boolean {
  return useContext(MapReadyContext).isMapReady;
}
