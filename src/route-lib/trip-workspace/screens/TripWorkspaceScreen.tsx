import type { AppShellProps } from '@component-lib/layout/AppShell';
import { AppShell } from '@component-lib/layout/AppShell';
import { DayEditor } from '@component-lib/days/DayEditor';
import { DeleteDayDialog } from '@component-lib/days/DeleteDayDialog';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { AddItemDialog } from '@route-lib/trip-workspace/ui/items/AddItemDialog';
import { ItemEditorDialog } from '@route-lib/trip-workspace/ui/items/ItemEditorDialog';
import { DragOverlay } from '@route-lib/trip-workspace/ui/items/DragOverlay';
import LegInfoPopup from '@route-lib/trip-workspace/ui/map/LegInfoPopup';

export interface TripWorkspaceLoadingState {
  status: 'loading';
}

export interface TripWorkspaceErrorState {
  status: 'error';
  title: string;
  message: string;
  onBackToTrips: () => void;
}

export interface TripWorkspaceReadyState {
  status: 'ready';
  appShellProps: AppShellProps;
  dayEditorProps: ComponentProps<typeof DayEditor>;
  deleteDayDialogProps: ComponentProps<typeof DeleteDayDialog>;
  addItemDialogProps: ComponentProps<typeof AddItemDialog>;
  itemEditorDialogProps: ComponentProps<typeof ItemEditorDialog>;
  legInfoPopupProps: ComponentProps<typeof LegInfoPopup> | null;
  dragOverlayProps: ComponentProps<typeof DragOverlay>;
}

export type TripWorkspaceScreenProps =
  | TripWorkspaceLoadingState
  | TripWorkspaceErrorState
  | TripWorkspaceReadyState;

export function TripWorkspaceScreen(props: TripWorkspaceScreenProps) {
  if (props.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (props.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-theme p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-theme bg-theme-elevated p-6 text-center shadow-theme-sm">
          <h1 className="text-xl font-semibold text-theme">{props.title}</h1>
          <p className="text-sm text-theme-secondary">{props.message}</p>
          <button
            type="button"
            onClick={props.onBackToTrips}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell {...props.appShellProps} />
      <DayEditor {...props.dayEditorProps} />
      <DeleteDayDialog {...props.deleteDayDialogProps} />
      <AddItemDialog {...props.addItemDialogProps} />
      <ItemEditorDialog {...props.itemEditorDialogProps} />
      {props.legInfoPopupProps ? <LegInfoPopup {...props.legInfoPopupProps} /> : null}
      <DragOverlay {...props.dragOverlayProps} />
    </>
  );
}
