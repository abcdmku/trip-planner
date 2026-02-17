import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ content, side = 'top' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-0.5 text-stone-300 transition-colors hover:text-stone-500"
        aria-label="Help"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-56 rounded-xl border border-stone-200 bg-white p-3 shadow-lg ${positionClasses[side]}`}
          role="tooltip"
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-2 top-2 text-stone-300 hover:text-stone-500"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-xs leading-relaxed text-stone-600">{content}</p>
        </div>
      )}
    </div>
  );
}
