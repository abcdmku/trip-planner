import type React from 'react';
import { X } from 'lucide-react';

export interface TimelineConnectorData {
  id: string;
  fromItemId: string;
  toItemId: string;
  /** Y position where the connector starts (bottom of fromItem) */
  startY: number;
  /** Y position where the connector ends (top of toItem) */
  endY: number;
  /** Gap duration in minutes between the two items */
  gapMinutes: number;
  /** Day color for styling */
  dayColor: string;
}

interface TimelineConnectorLineProps {
  connector: TimelineConnectorData;
  /** Left offset in pixels (e.g., gutter width + item left margin) */
  left: number;
  /** Width of the connector line area */
  width: number;
  onClick?: (connector: TimelineConnectorData) => void;
  onRemove?: (connector: TimelineConnectorData) => void;
  showRemoveButton?: boolean;
}

function formatGapDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TimelineConnectorLine({
  connector,
  left,
  width,
  onClick,
  onRemove,
  showRemoveButton = true,
}: TimelineConnectorLineProps) {
  const height = connector.endY - connector.startY;

  // Don't render if there's no visible gap or negative height (overlapping items)
  if (height < 4) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(connector);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(connector);
  };

  const showLabel = height >= 24 && connector.gapMinutes > 0;
  const showRemove = showRemoveButton && height >= 20;

  return (
    <div
      className="group absolute z-[5] cursor-pointer"
      style={{
        top: connector.startY,
        left,
        width,
        height,
      }}
      onClick={handleClick}
    >
      {/* Dashed line */}
      <div
        className="absolute left-1/2 h-full w-0 -translate-x-1/2 border-l-[3px] border-dashed transition-colors duration-100"
        style={{
          borderColor: `${connector.dayColor}80`,
        }}
      />

      {/* Hover highlight */}
      <div
        className="absolute inset-0 rounded opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        style={{
          backgroundColor: `${connector.dayColor}08`,
        }}
      />

      {/* Duration label */}
      {showLabel && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors duration-100"
            style={{
              backgroundColor: `${connector.dayColor}15`,
              color: `${connector.dayColor}`,
            }}
          >
            {formatGapDuration(connector.gapMinutes)}
          </span>
        </div>
      )}

      {/* Remove button */}
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
}
