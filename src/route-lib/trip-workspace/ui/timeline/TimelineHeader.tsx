interface TimelineHeaderProps {
  startHour: number;
  endHour: number;
  pixelsPerHour: number;
  currentTimeOffset?: number; // pixels from left for current time indicator
}

export function TimelineHeader({ startHour, endHour, pixelsPerHour, currentTimeOffset }: TimelineHeaderProps) {
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  return (
    <div className="relative border-b border-theme bg-theme-elevated/80 backdrop-blur-sm" style={{ height: 32 }}>
      {hours.map((hour) => {
        const left = (hour - startHour) * pixelsPerHour;
        const label = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
        return (
          <div
            key={hour}
            className="absolute top-0 flex h-full items-end pb-1"
            style={{ left }}
          >
            <span className="text-[10px] font-medium text-theme-tertiary">{label}</span>
            <div className="absolute bottom-0 left-0 h-2 w-px bg-theme-subtle" />
          </div>
        );
      })}

      {/* Current time indicator */}
      {currentTimeOffset !== undefined && currentTimeOffset >= 0 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-red-500"
          style={{ left: currentTimeOffset }}
        >
          <div className="absolute -left-1 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </div>
      )}
    </div>
  );
}
