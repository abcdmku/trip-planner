import { displayShort, minuteToY, toTime } from '@/component-lib/timeline/timeline-render-utils';

export interface TimelineAvailabilityBand {
  startMin: number;
  endMin: number;
}

export interface TimelineAvailabilityBandsProps {
  bands: TimelineAvailabilityBand[];
  dayColor: string;
  globalStartH: number;
  pxPerMin: number;
  left: number;
  right: number;
  label?: boolean;
  labelSize?: 'compact' | 'standard';
  labelColor?: string;
  backgroundAlpha?: string;
  borderAlpha?: string;
}

export function TimelineAvailabilityBands({
  bands,
  dayColor,
  globalStartH,
  pxPerMin,
  left,
  right,
  label = false,
  labelSize = 'standard',
  labelColor,
  backgroundAlpha = '10',
  borderAlpha = '35',
}: TimelineAvailabilityBandsProps) {
  const paddingClassName = labelSize === 'compact' ? 'px-1 pt-0.5' : 'px-1.5 pt-0.5';
  const textClassName = labelSize === 'compact' ? 'text-[7px]' : 'text-[8px]';

  return (
    <>
      {bands.map((range, index) => {
        const top = minuteToY(range.startMin, globalStartH, pxPerMin);
        const height = Math.max(2, (range.endMin - range.startMin) * pxPerMin);

        return (
          <div
            key={`avail-${range.startMin}-${range.endMin}-${index}`}
            className="pointer-events-none absolute overflow-hidden rounded-sm border border-dashed"
            style={{
              top,
              left,
              right,
              height,
              backgroundColor: `${dayColor}${backgroundAlpha}`,
              borderColor: `${dayColor}${borderAlpha}`,
            }}
          >
            {label && height >= (labelSize === 'compact' ? 18 : 20) && (
              <div className={paddingClassName}>
                <span
                  className={`rounded bg-theme/80 px-1 py-[1px] font-medium ${textClassName}`}
                  style={{ color: labelColor ?? `${dayColor}CC` }}
                >
                  {displayShort(toTime(range.startMin))} - {displayShort(toTime(range.endMin))}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
