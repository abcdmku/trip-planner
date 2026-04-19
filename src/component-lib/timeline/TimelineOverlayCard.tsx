import type React from 'react';

export interface TimelineOverlayCardProps {
  top: number;
  height: number;
  left: number;
  right: number;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function TimelineOverlayCard({
  top,
  height,
  left,
  right,
  zIndex = 40,
  className = '',
  style,
  children,
}: TimelineOverlayCardProps) {
  return (
    <div
      className={`absolute rounded-md border-2 border-dashed transition-[top] duration-75 ${className}`}
      style={{
        top,
        left,
        right,
        height,
        zIndex,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
