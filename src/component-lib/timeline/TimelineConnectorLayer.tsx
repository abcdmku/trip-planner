import type React from 'react';
import { X } from 'lucide-react';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';
import { minuteToY } from './timeline-render-utils';

function formatGapDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export interface TimelineConnectorLayerProps {
  connectors: TimelineConnectorWithTiming[];
  dayColor: string;
  startHour: number;
  pxPerMin: number;
  left: number;
  width: number;
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  showRemoveButton?: boolean;
}

export function TimelineConnectorLayer({
  connectors,
  dayColor,
  startHour,
  pxPerMin,
  left,
  width,
  onConnectorClick,
  onConnectorRemove,
  showRemoveButton = true,
}: TimelineConnectorLayerProps) {
  return (
    <>
      {connectors.map((connector) => {
        const startY = minuteToY(connector.fromEndMin, startHour, pxPerMin);
        const endY = minuteToY(connector.toStartMin, startHour, pxPerMin);
        const height = endY - startY;

        if (height < 4) return null;

        const showLabel = height >= 24 && connector.gapMinutes > 0;
        const showRemove = showRemoveButton && height >= 20;

        const handleClick = (event: React.MouseEvent) => {
          event.stopPropagation();
          onConnectorClick?.(connector);
        };

        const handleRemoveClick = (event: React.MouseEvent) => {
          event.stopPropagation();
          onConnectorRemove?.(connector);
        };

        return (
          <div
            key={connector.id}
            className="group absolute z-[5] cursor-pointer"
            style={{ top: startY, left, width, height }}
            onClick={handleClick}
          >
            <div
              className="absolute left-1/2 h-full w-0 -translate-x-1/2 border-l-[3px] border-dashed transition-colors duration-100"
              style={{ borderColor: `${dayColor}80` }}
            />

            <div
              className="absolute inset-0 rounded opacity-0 transition-opacity duration-100 group-hover:opacity-100"
              style={{ backgroundColor: `${dayColor}08` }}
            />

            {showLabel && (
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-100"
                  style={{
                    backgroundColor: `${dayColor}15`,
                    color: dayColor,
                  }}
                >
                  {formatGapDuration(connector.gapMinutes)}
                </span>
              </div>
            )}

            {showRemove && (
              <button
                type="button"
                onClick={handleRemoveClick}
                className="absolute right-0.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-theme-elevated opacity-0 shadow-sm transition-opacity duration-100 group-hover:opacity-100 hover:bg-red-500/10"
                title="Remove connection"
              >
                <X className="h-2.5 w-2.5 text-theme-tertiary hover:text-red-500" />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
