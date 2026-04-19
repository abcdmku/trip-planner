import type { RouteObject } from 'react-router-dom';
import { TripDashboardRoute } from './screens/TripDashboardRoute';

export const dashboardRoute: RouteObject = {
  index: true,
  element: <TripDashboardRoute />,
};
