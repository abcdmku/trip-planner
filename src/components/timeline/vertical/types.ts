import type { MutableRefObject, RefObject } from 'react';
import type { Day, Item } from '@/types/trip';
import type { ExternalDropMode } from '@/lib/timeline-drop';
import type { TimelineConnectorWithTiming } from '@/lib/connectors';

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

export interface LiveItemPreview {
  itemId: string;
  dayId: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
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
  onDragOverTimeline?: (isOver: boolean) => void;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, startTime: string, endTime: string) => void;
  /** Called when a connector line is clicked in the timeline */
  onTimelineConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onTimelineConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Set of connector IDs that have been manually suppressed */
  suppressedConnectorIds?: Set<string>;
  /** Whether to show auto-connect lines (global toggle) */
  showTimelineConnectors?: boolean;
  /** Callback to toggle the showTimelineConnectors setting */
  onToggleTimelineConnectors?: () => void;
}

export interface SingleDayTimelineProps {
  day: Day;
  items: Item[];
  allItems?: Item[];
  pxPerMin: number;
  pxPerHr: number;
  selectedItemId?: string | null;
  activeDragItemId?: string | null;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (startTime: string, endTime: string) => void;
  resolveExternalDrop?: ResolveExternalDrop;
  commitExternalDrop?: CommitExternalDrop;
  externalHeaderPreview?: ExternalDragPreview | null;
  /** Timeline connectors for this day */
  connectors?: TimelineConnectorWithTiming[];
  /** Called when a connector line is clicked */
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Whether to show auto-connect lines */
  showConnectors?: boolean;
}

export interface MultiDayColumnProps {
  day: Day;
  dayItems: Item[];
  allItems?: Item[];
  activeDragItemId?: string | null;
  pxPerMin: number;
  pxPerHr: number;
  globalStartH: number;
  globalEndH: number;
  gTotalH: number;
  gHours: number[];
  nowMin: number;
  selectedItemId: string | null;
  isActive: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (dayId: string, start: string, end: string) => void;
  onFocusDay: () => void;
  resolveExternalDrop?: ResolveExternalDrop;
  commitExternalDrop?: CommitExternalDrop;
  /** Called when a timeline block is dragged out of this column horizontally */
  onMoveOutOfBounds?: (info: CrossDayMoveInfo) => void;
  /** Active cross-day drag preview (managed by VerticalTimelineRoot) */
  crossDayDragPreview?: CrossDayDragPreview | null;
  /** Timeline connectors for this day */
  connectors?: TimelineConnectorWithTiming[];
  /** Called when a connector line is clicked */
  onConnectorClick?: (connector: TimelineConnectorWithTiming) => void;
  /** Called when remove button on a connector is clicked */
  onConnectorRemove?: (connector: TimelineConnectorWithTiming) => void;
  /** Whether to show auto-connect lines */
  showConnectors?: boolean;
}

export interface CrossDayMoveInfo {
  itemId: string;
  clientX: number;
  clientY: number;
  origStartMin: number;
  origEndMin: number;
}

/** Represents an active cross-day drag — rendered as a preview in the target column */
export interface CrossDayDragPreview {
  itemId: string;
  targetDayId: string;
  startMin: number;
  endMin: number;
}

export interface UseTimelinePointerInteractionOptions {
  dayDate: string;
  contentRef: MutableRefObject<HTMLElement | null>;
  getScrollTop: () => number;
  startHourRef: MutableRefObject<number>;
  pxPerMin: number;
  itemsById: Map<string, Item>;
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
  onLiveItemPreviewChange?: (preview: LiveItemPreview | null) => void;
  onItemClick?: (itemId: string) => void;
  onItemDoubleClick?: (itemId: string) => void;
  onCreateAtTime?: (startTime: string, endTime: string) => void;
  /** Called when a move drag exits the column horizontally (multi-day cross-day) */
  onMoveOutOfBounds?: (info: CrossDayMoveInfo) => void;
}
