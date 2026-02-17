import { useState } from 'react';
import { Compass, FileSpreadsheet, MapPin, Zap, X, ChevronRight } from 'lucide-react';

interface GettingStartedProps {
  onDismiss?: () => void;
}

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: 'Connect a Google Sheet',
    description: 'Create a new Google Sheet or connect an existing one. The app will set up the required tabs automatically.',
  },
  {
    icon: MapPin,
    title: 'Add Your Stops',
    description: 'Search for places and add them to your itinerary. Set times, durations, and notes for each stop.',
  },
  {
    icon: Compass,
    title: 'View Routes on Map',
    description: 'See your itinerary on the map with street-following routes between stops. Filter by day.',
  },
  {
    icon: Zap,
    title: 'Optimize Your Schedule',
    description: 'Use the optimizer to maximize activities or minimize travel time. Set priorities and availability windows.',
  },
];

export function GettingStarted({ onDismiss }: GettingStartedProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-base font-bold text-stone-800">Getting Started</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="rounded-lg p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all ${
                isActive ? 'bg-amber-50 ring-1 ring-amber-200' : isDone ? 'bg-stone-50' : 'hover:bg-stone-50'
              }`}
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                isActive ? 'bg-amber-500 text-white' : isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-amber-800' : 'text-stone-700'}`}>
                  {step.title}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-stone-500">{step.description}</p>
                )}
              </div>
              <ChevronRight className={`mt-1 h-4 w-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-200'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
