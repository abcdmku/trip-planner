import { GUTTER } from '../constants';
import { hourLabel } from '../time';

interface SingleDayTimelineGridProps {
  startH: number;
  hours: number[];
  nowY: number | null;
  pxPerHr: number;
  timezoneLabel?: string | null;
}

export function SingleDayTimelineGrid({
  startH,
  hours,
  nowY,
  pxPerHr,
  timezoneLabel,
}: SingleDayTimelineGridProps) {
  return (
    <>
      {timezoneLabel ? (
        <div className="absolute left-0 top-1 z-10 flex justify-end pr-2" style={{ width: GUTTER }}>
          <span className="rounded-full border border-theme bg-theme-subtle px-1.5 py-0.5 text-[9px] font-semibold text-theme-tertiary">
            {timezoneLabel}
          </span>
        </div>
      ) : null}

      <div
        className="absolute bottom-0 top-0 w-px"
        style={{ left: GUTTER, backgroundColor: 'rgb(var(--color-border) / 0.08)' }}
      />

      {hours.map((hour) => {
        const y = (hour - startH) * pxPerHr;
        return (
          <div key={hour}>
            <div
              className="absolute flex items-center justify-end pr-2"
              style={{ left: 0, width: GUTTER, top: y - 7 }}
            >
              <span className="select-none text-[10px] font-medium tabular-nums text-theme-tertiary opacity-50">
                {hourLabel(hour)}
              </span>
            </div>
            <div
              className="absolute h-px"
              style={{
                top: y,
                left: GUTTER,
                right: 0,
                backgroundColor: 'rgb(var(--color-border) / 0.06)',
              }}
            />
          </div>
        );
      })}

      {hours.slice(0, -1).flatMap((hour) =>
        [1, 2, 3].map((quarter) => (
          <div
            key={`q-${hour}-${quarter}`}
            className="absolute h-px"
            style={{
              top: (hour - startH) * pxPerHr + (quarter * pxPerHr) / 4,
              left: GUTTER,
              right: 0,
              backgroundColor:
                quarter === 2
                  ? 'rgb(var(--color-border) / 0.04)'
                  : 'rgb(var(--color-border) / 0.025)',
            }}
          />
        )),
      )}

      {nowY !== null && (
        <>
          <div
            className="absolute z-30 rounded-full bg-red-500"
            style={{ top: nowY - 3.5, left: GUTTER - 7, width: 7, height: 7 }}
          />
          <div
            className="absolute z-30 bg-red-500"
            style={{ top: nowY - 0.5, left: GUTTER, right: 0, height: 1.5, borderRadius: 1 }}
          />
        </>
      )}
    </>
  );
}
