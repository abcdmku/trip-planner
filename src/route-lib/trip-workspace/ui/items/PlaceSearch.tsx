import { useState, useCallback, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import type { PlaceSearchResult } from '@/services/maps-repository';
import { mapsRepository } from '@/services/maps-repository';

interface PlaceSearchProps {
  onSelect: (place: PlaceSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function PlaceSearch({
  onSelect,
  placeholder = 'Search for a place...',
  autoFocus = false,
}: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
  }, [autoFocus]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    setIsSearching(true);
    try {
      const res = await mapsRepository.searchPlace(q);
      setResults(res);
      setIsOpen(res.length > 0);
      setActiveIndex(res.length > 0 ? 0 : -1);
    } catch {
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelect = useCallback(
    (place: PlaceSearchResult) => {
      setQuery(place.name);
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect(place);
    },
    [onSelect],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (results.length === 0) return;
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev + 1 + results.length) % results.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (results.length === 0) return;
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      if (!isOpen || results.length === 0) return;
      e.preventDefault();
      const selected = results[activeIndex >= 0 ? activeIndex : 0];
      if (selected) handleSelect(selected);
      return;
    }

    if (e.key === 'Escape') {
      if (!isOpen) return;
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-secondary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input w-full pl-10 pr-10"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-theme-secondary" />
          ) : query ? (
            <button
              type="button"
              onClick={clear}
              className="flex items-center justify-center text-theme-secondary hover:text-theme"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && results.length > 0 ? (
        <ul
          id={listboxId}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-theme bg-theme-elevated py-1 shadow-theme-lg"
          role="listbox"
        >
          {results.map((place, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={place.placeId}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={active}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(place)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-theme-subtle' : 'hover:bg-theme-subtle'
                  }`}
                >
                  <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-theme-secondary'}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-theme">{place.name}</p>
                    <p className="truncate text-xs text-theme-tertiary">{place.address}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
