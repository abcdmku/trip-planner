import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthGuard } from '@app/auth/AuthGuard';
import { dashboardRoute } from '@route-lib/dashboard/routes';
import { tripWorkspaceRoute } from '@route-lib/trip-workspace/routes';

function RootLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [dashboardRoute, tripWorkspaceRoute],
  },
]);
