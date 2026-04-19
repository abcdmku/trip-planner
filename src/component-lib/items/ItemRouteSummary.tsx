import { ItemRouteStopRow } from './ItemRouteStopRow';

export interface ItemRouteSummaryProps {
  originTitle: string;
  originSubtitle?: string;
  destinationTitle: string;
  destinationSubtitle?: string;
  travelBadge?: string;
  emptyDestinationLabel?: string;
}

export function ItemRouteSummary({
  originTitle,
  originSubtitle,
  destinationTitle,
  destinationSubtitle,
  travelBadge,
  emptyDestinationLabel = 'Optional',
}: ItemRouteSummaryProps) {
  return (
    <div className="space-y-2">
      <ItemRouteStopRow marker="origin">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-theme">{originTitle}</p>
          {originSubtitle ? (
            <p className="truncate text-[10px] text-theme-tertiary">{originSubtitle}</p>
          ) : null}
        </div>
      </ItemRouteStopRow>

      <ItemRouteStopRow marker="destination">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-theme">{destinationTitle}</p>
          {destinationSubtitle ? (
            <p className="truncate text-[10px] text-theme-tertiary">{destinationSubtitle}</p>
          ) : (
            <p className="truncate text-[10px] text-theme-tertiary">{emptyDestinationLabel}</p>
          )}
        </div>
        {travelBadge ? (
          <span className="shrink-0 text-[11px] font-medium text-theme-tertiary">
            {travelBadge}
          </span>
        ) : null}
      </ItemRouteStopRow>
    </div>
  );
}
