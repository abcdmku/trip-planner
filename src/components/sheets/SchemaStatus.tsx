import { Check, X, Loader2, Database } from 'lucide-react';

interface SchemaStatusProps {
  status: 'validating' | 'valid' | 'invalid' | 'initializing';
  errors?: string[];
}

const statusConfig = {
  validating: {
    icon: Loader2,
    label: 'Validating schema...',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    animate: true,
  },
  valid: {
    icon: Check,
    label: 'Schema valid',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    animate: false,
  },
  invalid: {
    icon: X,
    label: 'Schema invalid',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    animate: false,
  },
  initializing: {
    icon: Loader2,
    label: 'Setting up sheet...',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    animate: true,
  },
} as const;

export function SchemaStatus({ status, errors = [] }: SchemaStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-center gap-2">
        <Database className="h-3.5 w-3.5 text-theme-tertiary" />
        <Icon
          className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {status === 'invalid' && errors.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6" role="list">
          {errors.map((error, i) => (
            <li key={i} className="text-xs text-red-400">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
