import { ChevronDown, Trash2, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { RouteType, TransportMode } from '@/types/trip';
import type { PlaceSearchResult } from '@/services/maps-repository';
import {
  ItemLocationCard,
  ItemRouteStopRow,
  ItemRouteSummary,
  ItemRouteTravelControls,
} from '@/component-lib/items';
import type { EventEditorValue } from './EventEditorForm';
import { PlaceSearch } from './PlaceSearch';

type LocationCardMode = 'action-card' | 'clickable-card';
type DestinationEmptyMode = 'inline-search' | 'cta-card';

interface ItemRouteEditorSectionProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  surfaceStyle?: 'card' | 'plain';
  headerSummaryVariant?: 'pill' | 'text' | 'hidden';
  collapsible?: boolean;
  isOpen?: boolean;
  dayColor?: string;
  selectedPlace: PlaceSearchResult | null;
  destinationPlace: PlaceSearchResult | null;
  customOriginName?: string;
  isCustomOrigin?: boolean;
  allowCustomOriginName?: boolean;
  isEditingOrigin: boolean;
  isEditingDestination: boolean;
  locationCardMode?: LocationCardMode;
  destinationEmptyMode?: DestinationEmptyMode;
  allowOriginClear?: boolean;
  allowDestinationClear?: boolean;
  editorValue: EventEditorValue;
  routeBadge: string;
  showTravelControls: boolean;
  canCalculateRoute: boolean;
  hasCalculatedRoute: boolean;
  travelDurationMinutes: number;
  isCalculatingRoute: boolean;
  openInGoogleMapsUrl?: string;
  headerActions?: ReactNode;
  onToggle?: () => void;
  onOriginEditStart: () => void;
  onOriginEditCancel: () => void;
  onDestinationEditStart: () => void;
  onDestinationEditCancel: () => void;
  onOriginSelect: (place: PlaceSearchResult) => void;
  onDestinationSelect: (place: PlaceSearchResult) => void;
  onOriginClear?: () => void;
  onDestinationClear?: () => void;
  onCustomOriginNameChange?: (value: string) => void;
  onRouteChange: (next: { transportMode: TransportMode; itemRouteType: RouteType }) => void;
  onCalculateRoute: () => void;
}

function IconAction({
  label,
  onClick,
  tone = 'default',
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        tone === 'danger'
          ? 'border-red-500/15 text-red-500 hover:bg-red-500/10'
          : 'border-theme bg-theme text-theme-tertiary hover:bg-theme-subtle hover:text-theme'
      }`}
    >
      {children}
    </button>
  );
}

function LinkAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[11px] font-semibold text-theme-secondary transition-colors hover:bg-theme hover:text-theme"
    >
      {children}
    </button>
  );
}

function SearchEditor({
  autoFocus = false,
  placeholder,
  onSelect,
  onCancel,
}: {
  autoFocus?: boolean;
  placeholder: string;
  onSelect: (place: PlaceSearchResult) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <PlaceSearch autoFocus={autoFocus} onSelect={onSelect} placeholder={placeholder} />
      <button
        type="button"
        onClick={onCancel}
        className="text-[11px] font-medium text-theme-tertiary transition-colors hover:text-theme-secondary"
      >
        Cancel
      </button>
    </div>
  );
}

function buildOriginTitle(
  selectedPlace: PlaceSearchResult | null,
  isCustomOrigin: boolean,
  customOriginName?: string,
) {
  if (!selectedPlace) return 'Choose starting point';
  if (!isCustomOrigin) return selectedPlace.name;
  return customOriginName?.trim() || 'Map pin';
}

function buildDestinationTitle(destinationPlace: PlaceSearchResult | null) {
  return destinationPlace ? destinationPlace.name : 'Add destination';
}

export function ItemRouteEditorSection({
  title = 'Travel setup',
  subtitle,
  compact = false,
  surfaceStyle = 'card',
  headerSummaryVariant = compact ? 'text' : 'pill',
  collapsible = false,
  isOpen = true,
  dayColor,
  selectedPlace,
  destinationPlace,
  customOriginName = '',
  isCustomOrigin = false,
  allowCustomOriginName = false,
  isEditingOrigin,
  isEditingDestination,
  locationCardMode = 'action-card',
  destinationEmptyMode = 'inline-search',
  allowOriginClear = false,
  allowDestinationClear = false,
  editorValue,
  routeBadge,
  showTravelControls,
  canCalculateRoute,
  hasCalculatedRoute,
  travelDurationMinutes,
  isCalculatingRoute,
  openInGoogleMapsUrl,
  headerActions,
  onToggle,
  onOriginEditStart,
  onOriginEditCancel,
  onDestinationEditStart,
  onDestinationEditCancel,
  onOriginSelect,
  onDestinationSelect,
  onOriginClear,
  onDestinationClear,
  onCustomOriginNameChange,
  onRouteChange,
  onCalculateRoute,
}: ItemRouteEditorSectionProps) {
  const customOriginNameFieldId = useId();
  const customOriginNameErrorId = useId();
  const collapsibleHeader = collapsible && onToggle;
  const originTitle = buildOriginTitle(selectedPlace, isCustomOrigin, customOriginName);
  const destinationTitle = buildDestinationTitle(destinationPlace);
  const headerSummary = showTravelControls ? routeBadge : 'Origin and destination';
  const showSummaryPill = headerSummaryVariant === 'pill';
  const showSummaryText = headerSummaryVariant === 'text';
  const showHeader =
    surfaceStyle === 'card' &&
    (Boolean(title) || Boolean(subtitle) || Boolean(headerActions) || collapsibleHeader);

  const renderOriginCard = () => {
    if (isEditingOrigin) {
      return (
        <SearchEditor
          autoFocus
          placeholder="Search origin..."
          onSelect={onOriginSelect}
          onCancel={onOriginEditCancel}
        />
      );
    }

    if (!selectedPlace) {
      return <PlaceSearch onSelect={onOriginSelect} placeholder="Search origin..." />;
    }

    const titleText = originTitle;
    const subtitleText = selectedPlace.address;
    const shouldUseActionCard = locationCardMode === 'action-card' || isCustomOrigin;

    if (!shouldUseActionCard) {
      return (
        <ItemLocationCard
          title={titleText}
          subtitle={subtitleText}
          onClick={onOriginEditStart}
          ariaLabel="Edit origin"
        />
      );
    }

    return (
      <div className="space-y-2">
        <ItemLocationCard
          title={titleText}
          subtitle={subtitleText}
          paddedForActions={allowOriginClear || isCustomOrigin}
          actions={
            <div className="flex items-center gap-1">
              <LinkAction onClick={onOriginEditStart}>Change</LinkAction>
              {allowOriginClear && onOriginClear ? (
                <IconAction label="Clear origin" onClick={onOriginClear}>
                  <X className="h-4 w-4" />
                </IconAction>
              ) : null}
            </div>
          }
        />

        {allowCustomOriginName && isCustomOrigin ? (
          <div>
            <label
              htmlFor={customOriginNameFieldId}
              className="mb-0.5 block text-[10px] text-theme-tertiary"
            >
              Location name
            </label>
            <input
              id={customOriginNameFieldId}
              type="text"
              value={customOriginName}
              onChange={(event) => onCustomOriginNameChange?.(event.target.value)}
              placeholder="Name this location"
              aria-describedby={!customOriginName.trim() ? customOriginNameErrorId : undefined}
              className="input w-full py-1.5 text-xs"
            />
            {!customOriginName.trim() ? (
              <p id={customOriginNameErrorId} className="mt-1 text-[10px] text-red-600">
                A name is required for map pins.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderDestinationCard = () => {
    if (isEditingDestination) {
      return (
        <SearchEditor
          autoFocus
          placeholder="Search destination..."
          onSelect={onDestinationSelect}
          onCancel={onDestinationEditCancel}
        />
      );
    }

    if (!destinationPlace && destinationEmptyMode === 'inline-search') {
      return <PlaceSearch onSelect={onDestinationSelect} placeholder="Search destination..." />;
    }

    if (!destinationPlace) {
      return (
        <ItemLocationCard
          title={destinationTitle}
          description="Add one to estimate travel time and open the route in Maps."
          onClick={onDestinationEditStart}
          ariaLabel="Add destination"
        />
      );
    }

    if (locationCardMode === 'clickable-card') {
      return (
        <ItemLocationCard
          title={destinationTitle}
          subtitle={destinationPlace.address}
          onClick={onDestinationEditStart}
          ariaLabel="Edit destination"
          paddedForActions={allowDestinationClear}
          actions={
            allowDestinationClear && onDestinationClear ? (
              <IconAction label="Clear destination" onClick={onDestinationClear}>
                <X className="h-4 w-4" />
              </IconAction>
            ) : null
          }
        />
      );
    }

    return (
      <ItemLocationCard
        title={destinationTitle}
        subtitle={destinationPlace.address}
        paddedForActions={allowDestinationClear}
        actions={
          <div className="flex items-center gap-1">
            <LinkAction onClick={onDestinationEditStart}>Change</LinkAction>
            {allowDestinationClear && onDestinationClear ? (
              <IconAction label="Clear destination" onClick={onDestinationClear}>
                <X className="h-4 w-4" />
              </IconAction>
            ) : null}
          </div>
        }
      />
    );
  };

  const headerContent = showHeader ? (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {title ? <h3 className="text-sm font-semibold text-theme">{title}</h3> : null}
          {showSummaryPill ? (
            <span className="max-w-full truncate rounded-full border border-theme bg-theme px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-theme-tertiary">
              {headerSummary}
            </span>
          ) : null}
        </div>
        {subtitle || showSummaryText ? (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            {subtitle ? <p className="min-w-0 flex-1 text-xs text-theme-secondary">{subtitle}</p> : null}
            {showSummaryText ? (
              <span className="max-w-full truncate text-[11px] font-medium text-theme-tertiary">
                {headerSummary}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {headerActions ? (
        <div className="flex shrink-0 items-center gap-1 self-start">{headerActions}</div>
      ) : null}
      {collapsibleHeader ? (
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-theme-tertiary transition-transform ${isOpen ? '' : '-rotate-90'}`}
        />
      ) : null}
    </>
  ) : null;

  const expandedContent = (
    <div
      className={
        surfaceStyle === 'plain'
          ? 'space-y-3'
          : `${showHeader ? 'mt-3 ' : ''}space-y-3 rounded-xl bg-theme-subtle p-3`
      }
    >
      <ItemRouteStopRow marker="origin" accentColor={dayColor} showConnector>
        {renderOriginCard()}
      </ItemRouteStopRow>

      <ItemRouteStopRow marker="destination" accentColor={dayColor}>
        {renderDestinationCard()}
      </ItemRouteStopRow>

      {showTravelControls ? (
        <div className={surfaceStyle === 'plain' ? '' : 'border-t border-theme-subtle pt-3'}>
          <ItemRouteTravelControls
            transportMode={editorValue.transportMode}
            itemRouteType={editorValue.itemRouteType}
            onChange={onRouteChange}
            compact={compact}
            hasOrigin={Boolean(selectedPlace)}
            hasDestination={Boolean(destinationPlace)}
            openInGoogleMapsUrl={openInGoogleMapsUrl}
            onCalculateRoute={onCalculateRoute}
            isCalculatingRoute={isCalculatingRoute}
            canCalculateRoute={canCalculateRoute}
            hasCalculatedRoute={hasCalculatedRoute}
            travelDurationMinutes={travelDurationMinutes}
          />
        </div>
      ) : null}
    </div>
  );

  if (surfaceStyle === 'plain') {
    return <section>{expandedContent}</section>;
  }

  return (
    <section className="rounded-2xl border border-theme bg-theme p-3 shadow-theme-sm">
      {showHeader && collapsibleHeader ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-start gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-theme-subtle"
        >
          {headerContent}
        </button>
      ) : showHeader ? (
        <div className="flex items-start gap-3 px-1 py-1">{headerContent}</div>
      ) : null}

      {collapsible && !isOpen ? (
        <div className="mt-3 rounded-xl bg-theme-subtle p-3">
          <ItemRouteSummary
            originTitle={originTitle}
            originSubtitle={selectedPlace?.address}
            destinationTitle={destinationPlace ? destinationTitle : 'No destination'}
            destinationSubtitle={destinationPlace?.address}
            emptyDestinationLabel="Optional"
            travelBadge={showTravelControls ? routeBadge : undefined}
          />
        </div>
      ) : (
        expandedContent
      )}
    </section>
  );
}

export function ItemRouteEditorHeaderActions({
  onDelete,
  onClose,
}: {
  onDelete?: () => void;
  onClose?: () => void;
}) {
  if (!onDelete && !onClose) return null;

  return (
    <>
      {onDelete ? (
        <IconAction label="Delete item" onClick={onDelete} tone="danger">
          <Trash2 className="h-4 w-4" />
        </IconAction>
      ) : null}
      {onClose ? (
        <IconAction label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconAction>
      ) : null}
    </>
  );
}
