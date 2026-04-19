import type { RouteObject } from 'react-router-dom';
import { TripWorkspaceRoute } from './screens/TripWorkspaceRoute';

export const tripWorkspaceRoute: RouteObject = {
  path: 'trip/:tripId',
  element: <TripWorkspaceRoute />,
};
