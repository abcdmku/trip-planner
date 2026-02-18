import type { MutableRefObject, RefObject } from 'react';
import type { Day, Item } from '@/types/trip';
import type { ExternalDropMode } from '@/lib/timeline-drop';

export type ViewMode = 'day' | 'multi';

export type Interaction =
  | { type: 'idle' }
  | { type: 'creating'; startMin: number; endMin: number }
  | { type: 'moving'; itemId: string; deltaMin: number }
  | { type: 'resizing'; itemId: string; startMin: number; endMin: number };

export interface PtrTrack {
  action: 'create' | 'move' | 'resize-top' | 'resize-bottom';
  anchorClientY: number;
  anchorMin: number;
  containerTop: number;
  activated: boolean;
  itemId?: string;
  origStartMin?: number;
  origEndMin?: number;
  curStartMin: number;
  curEndMin: number;
  curDelta: number;
}

export interface ItemVisualPosition {
  top: number;
  height: number;
  startMin: number;
  endMin: number;
  active: boolean;
}

export interface ExternalDragPreview {
  itemId: string;
  dayId: string;
  mode: ExternalDropMode;
  valid: boolean;
  startMin: number;
  endMin: number;
  durationMinutes: number;
}

export interface ResolveExternalDropInput {
  itemId: string;
  day: Day;
  mode: ExternalDropMode;
  anchorMin?: number;
}

export type ResolveExternalDrop = (input: ResolveExternalDropInput) => ExternalDragPreview | null;
export type CommitExternalDrop = (preview: ExternalDragPreview) => void;

export interface VerticalTimelineProps {
  items: Item[];
  days: Day[];
  selectedDayIds?: string[];
  selectedItemId?: string | null;
  activeDragItemId?: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, startTime: string, endTime: string) => void;
}

export interface SingleDayTimelineProps {
  day: Day;
  items: Item[];
  selectedItemId?: string | null;
  activeDragItemId?: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (startTime: string, endTime: string) => void;
  resolveExternalDrop?: ResolveExternalDrop;
  commitExternalDrop?: CommitExternalDrop;
  externalHeaderPreview?: ExternalDragPreview | null;
}

export interface MultiDayColumnProps {
  day: Day;
  dayItems: Item[];
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
  activeDragItemId?: string | null;
  isActive: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, start: string, end: string) => void;
  onFocusDay: () => void;
  resolveExternalDrop?: ResolveExternalDrop;
  commitExternalDrop?: CommitExternalDrop;
}

export interface UseTimelinePointerInteractionOptions {
  dayDate: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  getScrollTop: () => number;
  startHourRef: MutableRefObject<number>;
  itemsById: Map<string, Item>;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (startTime: string, endTime: string) => void;
}
