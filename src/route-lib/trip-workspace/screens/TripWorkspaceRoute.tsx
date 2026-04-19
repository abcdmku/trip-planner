import { useParams } from 'react-router-dom';
import { TripWorkspaceController } from '../controllers/TripWorkspaceController';

export function TripWorkspaceRoute() {
  const { tripId } = useParams<{ tripId: string }>();
  if (!tripId) {
    return null;
  }

  return <TripWorkspaceController tripId={tripId} />;
}
