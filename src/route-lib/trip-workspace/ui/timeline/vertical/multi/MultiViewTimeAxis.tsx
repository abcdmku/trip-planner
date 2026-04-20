import { MULTI_HEADER_H, TIME_AXIS_W } from '../constants';
import { hourLabel } from '../time';

interface MultiViewTimeAxisProps {
  globalStartH: number;
  gHours: number[];
  gTotalH: number;
  pxPerHr: number;
  timezoneLabel?: string | null;
}

export function MultiViewTimeAxis({
  globalStartH,
  gHours,
  gTotalH,
  pxPerHr,
  timezoneLabel,
}: MultiViewTimeAxisProps) {
  return (
    <div
      className="sticky left-0 z-20 flex-shrink-0 border-r border-theme-subtle bg-theme py-2"
      style={{ width: TIME_AXIS_W }}
    >
      <div
        className="sticky top-0 z-30 flex items-center justify-end border-b border-theme-subtle bg-theme px-2"
        style={{ height: MULTI_HEADER_H }}
      >
        {timezoneLabel ? (
          <span className="rounded-full border border-theme bg-theme-subtle px-2 py-0.5 text-[9px] font-semibold text-theme-tertiary">
            {timezoneLabel}
          </span>
        ) : null}
      </div>
      <div className="relative" style={{ height: gTotalH }}>
        {gHours.map((hour) => {
          const y = (hour - globalStartH) * pxPerHr;
          return (
            <div
              key={hour}
              className="absolute flex items-center justify-end pr-2"
              style={{ left: 0, width: TIME_AXIS_W, top: y - 7 }}
            >
              <span className="select-none text-[10px] font-medium tabular-nums text-theme-tertiary opacity-50">
                {hourLabel(hour)}
              </span>
            </div>
          );
        })}

        {gHours.slice(0, -1).flatMap((hour) =>
          [1, 2, 3].map((quarter) => {
            const y = (hour - globalStartH) * pxPerHr + (quarter * pxPerHr) / 4;
            return (
              <div
                key={`t-${hour}-${quarter}`}
                className="absolute"
                style={{
                  top: y,
                  right: 0,
                  width: quarter === 2 ? 8 : 4,
                  height: 1,
                  backgroundColor: 'rgb(var(--color-border) / 0.15)',
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
