import { Navigation } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ItemRouteStopRowProps {
  marker: 'origin' | 'destination';
  accentColor?: string;
  showConnector?: boolean;
  children: ReactNode;
}

export function ItemRouteStopRow({
  marker,
  accentColor,
  showConnector = false,
  children,
}: ItemRouteStopRowProps) {
  const railClassName = `relative flex w-4 shrink-0 items-center justify-center self-stretch ${
    accentColor ? '' : 'text-accent'
  }`;

  return (
    <div className="flex items-center gap-2.5">
      <div className={railClassName} style={accentColor ? { color: accentColor } : undefined}>
        {marker === 'origin' ? (
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        ) : (
          <Navigation className="h-4 w-4 shrink-0" />
        )}
        {showConnector ? (
          <span className="pointer-events-none absolute bottom-[-0.75rem] left-1/2 top-[calc(50%+0.375rem)] -translate-x-1/2 border-l border-dashed border-current" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
