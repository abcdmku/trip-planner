import type { OptimizationMode } from '../types/domain';

interface TripControlsProps {
  tripNameInput: string;
  timezoneInput: string;
  loadSheetUrl: string;
  optimizeMode: OptimizationMode;
  onTripNameChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onLoadSheetUrlChange: (value: string) => void;
  onCreateTrip: () => void;
  onLoadTrip: () => void;
  onSaveTrip: () => void;
  onRecalcVisibleLegs: () => void;
  onOptimizeVisibleDays: () => void;
  onOptimizeModeChange: (mode: OptimizationMode) => void;
  disabled: boolean;
}

export function TripControls({
  tripNameInput,
  timezoneInput,
  loadSheetUrl,
  optimizeMode,
  onTripNameChange,
  onTimezoneChange,
  onLoadSheetUrlChange,
  onCreateTrip,
  onLoadTrip,
  onSaveTrip,
  onRecalcVisibleLegs,
  onOptimizeVisibleDays,
  onOptimizeModeChange,
  disabled
}: TripControlsProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Trip Controls</p>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Trip Name</span>
        <input
          value={tripNameInput}
          onChange={(event) => onTripNameChange(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
        />
      </label>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Base Timezone</span>
        <input
          value={timezoneInput}
          onChange={(event) => onTimezoneChange(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCreateTrip}
          disabled={disabled}
          className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create Trip Sheet
        </button>
      </div>

      <label className="grid gap-1 text-xs">
        <span className="text-slate-400">Load Google Sheet URL</span>
        <input
          value={loadSheetUrl}
          onChange={(event) => onLoadSheetUrlChange(event.target.value)}
          className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </label>

      <button
        type="button"
        onClick={onLoadTrip}
        disabled={disabled}
        className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Load Sheet
      </button>

      <div className="grid gap-2 border-t border-slate-700 pt-3">
        <label className="grid gap-1 text-xs">
          <span className="text-slate-400">Optimize Mode</span>
          <select
            value={optimizeMode}
            onChange={(event) => onOptimizeModeChange(event.target.value as OptimizationMode)}
            className="rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100"
          >
            <option value="maximize_available_activities">Maximize Available Activities</option>
            <option value="minimize_travel_time">Minimize Travel Time</option>
          </select>
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onOptimizeVisibleDays}
            disabled={disabled}
            className="rounded-lg bg-fuchsia-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Optimize Visible
          </button>
          <button
            type="button"
            onClick={onRecalcVisibleLegs}
            disabled={disabled}
            className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh ETAs
          </button>
          <button
            type="button"
            onClick={onSaveTrip}
            disabled={disabled}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save to Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
