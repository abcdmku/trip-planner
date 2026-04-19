import { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  title?: string;
  label?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

const POSITION_CLASSES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const;

export function HelpTooltip({
  content,
  side = 'top',
  title,
  label = 'Help',
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: HelpTooltipProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }

    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className="rounded-full p-0.5 text-stone-300 transition-colors hover:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={isOpen ? tooltipId : undefined}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen ? (
        <div
          id={tooltipId}
          className={`absolute z-50 w-56 rounded-xl border border-stone-200 bg-white p-3 shadow-lg ${POSITION_CLASSES[side]}`}
          role="tooltip"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 text-stone-300 hover:text-stone-500"
            aria-label="Close help"
          >
            <X className="h-3 w-3" />
          </button>
          {title ? <p className="pr-5 text-xs font-semibold text-stone-800">{title}</p> : null}
          <p className={`text-xs leading-relaxed text-stone-600 ${title ? 'mt-1' : ''}`}>
            {content}
          </p>
        </div>
      ) : null}
    </div>
  );
}
