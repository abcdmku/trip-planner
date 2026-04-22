import { CalendarDays } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

type NativeDateInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>;

export interface DateInputProps extends NativeDateInputProps {}

export function DateInput({ className = '', ...props }: DateInputProps) {
  return (
    <div className="relative min-w-0">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-tertiary" />
      <input
        type="date"
        {...props}
        className={`input input-date w-full min-w-0 pl-9 ${className}`.trim()}
      />
    </div>
  );
}
