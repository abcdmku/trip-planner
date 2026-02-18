import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import type { PlaceSearchResult } from '../../services/maps-repository';
import { mapsRepository } from '../../services/maps-repository';

interface PlaceSearchProps {
  onSelect: (place: PlaceSearchResult) => void;
  placeholder?: string;
}

export function PlaceSearch({ onSelect, placeholder = 'Search for a place...' }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await mapsRepository.searchPlace(q);
      setResults(res);
      setIsOpen(res.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (place: PlaceSearchResult) => {
    setQuery(place.name);
    setIsOpen(false);
    setResults([]);
    onSelect(place);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-tertiary" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="input w-full pl-10 pr-10"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-theme-tertiary" />
          ) : query ? (
            <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="flex items-center justify-center text-theme-tertiary hover:text-theme-secondary">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-theme bg-theme-elevated py-1 shadow-theme-lg" role="listbox">
          {results.map((place) => (
            <li key={place.placeId}>
              <button
                onClick={() => handleSelect(place)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-theme-subtle"
                role="option"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-theme">{place.name}</p>
                  <p className="truncate text-xs text-theme-tertiary">{place.address}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
