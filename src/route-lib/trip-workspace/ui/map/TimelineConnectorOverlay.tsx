import type { TimelineConnector } from '@/lib/connectors';
import RoutePath from './RoutePath';

interface TimelineConnectorOverlayProps {
  connectors: TimelineConnector[];
  selectedDayIds?: string[];
  onConnectorClick?: (connector: TimelineConnector) => void;
}

export default function TimelineConnectorOverlay({
  connectors,
  selectedDayIds,
  onConnectorClick,
}: TimelineConnectorOverlayProps) {
  const selectedSet = selectedDayIds && selectedDayIds.length > 0 ? new Set(selectedDayIds) : null;
  const visible = selectedSet
    ? connectors.filter((connector) => selectedSet.has(connector.dayId))
    : connectors;

  return (
    <>
      {visible.map((connector) => (
        <RoutePath
          key={connector.id}
          encodedPath=""
          fromLatLng={connector.from}
          toLatLng={connector.to}
          color="#60A5FA"
          weight={3}
          opacity={0.75}
          onClick={onConnectorClick ? () => onConnectorClick(connector) : undefined}
        />
      ))}
    </>
  );
}
