import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Compass, FileSpreadsheet, MapPin, X, Zap } from 'lucide-react';

export interface GettingStartedStep {
  icon: LucideIcon;
  title: string;
  description: string;
  disabled?: boolean;
}

export interface GettingStartedProps {
  title?: string;
  steps?: readonly GettingStartedStep[];
  currentStep?: number;
  initialStep?: number;
  onStepChange?: (index: number) => void;
  onDismiss?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const DEFAULT_GETTING_STARTED_STEPS: readonly GettingStartedStep[] = [
  {
    icon: FileSpreadsheet,
    title: 'Connect a Google Sheet',
    description:
      'Create a new Google Sheet or connect an existing one. The app will set up the required tabs automatically.',
  },
  {
    icon: MapPin,
    title: 'Add Your Stops',
    description:
      'Search for places and add them to your itinerary. Set times, durations, and notes for each stop.',
  },
  {
    icon: Compass,
    title: 'View Routes on Map',
    description:
      'See your itinerary on the map with street-following routes between stops. Filter by day.',
  },
  {
    icon: Zap,
    title: 'Optimize Your Schedule',
    description:
      'Use the optimizer to maximize activities or minimize travel time. Set priorities and availability windows.',
  },
];

function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, stepCount - 1));
}

interface GettingStartedStepButtonProps {
  step: GettingStartedStep;
  index: number;
  isActive: boolean;
  isDone: boolean;
  onSelect: (index: number) => void;
}

function GettingStartedStepButton({
  step,
  index,
  isActive,
  isDone,
  onSelect,
}: GettingStartedStepButtonProps) {
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      disabled={step.disabled}
      aria-pressed={isActive}
      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
        isActive
          ? 'bg-amber-50 ring-1 ring-amber-200'
          : isDone
            ? 'bg-stone-50'
            : 'hover:bg-stone-50'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isActive
            ? 'bg-amber-500 text-white'
            : isDone
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-stone-100 text-stone-400'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${isActive ? 'text-amber-800' : 'text-stone-700'}`}>
          {step.title}
        </p>
        {isActive ? <p className="mt-0.5 text-xs text-stone-500">{step.description}</p> : null}
      </div>
      <ChevronRight
        className={`mt-1 h-4 w-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-200'}`}
      />
    </button>
  );
}

export function GettingStarted({
  title = 'Getting Started',
  steps = DEFAULT_GETTING_STARTED_STEPS,
  currentStep,
  initialStep = 0,
  onStepChange,
  onDismiss,
  emptyTitle = 'No steps available',
  emptyDescription = 'Add setup steps to guide people through the workflow.',
}: GettingStartedProps) {
  const [internalStep, setInternalStep] = useState(initialStep);
  const isControlled = currentStep !== undefined;
  const activeStep = clampStepIndex(
    isControlled ? currentStep : internalStep,
    steps.length,
  );

  const handleSelect = (index: number) => {
    if (!isControlled) {
      setInternalStep(index);
    }

    onStepChange?.(index);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-stone-800">{title}</h3>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
            aria-label="Dismiss getting started"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {steps.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-6">
          <p className="text-sm font-medium text-stone-700">{emptyTitle}</p>
          <p className="mt-1 text-xs text-stone-500">{emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <GettingStartedStepButton
              key={`${step.title}-${index}`}
              step={step}
              index={index}
              isActive={index === activeStep}
              isDone={index < activeStep}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
