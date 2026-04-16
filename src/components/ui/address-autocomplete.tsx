
'use client';

import * as React from 'react';
import { Search, MapPin, Loader2, X, Navigation2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { motion, AnimatePresence } from 'framer-motion';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: NominatimResult) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: AddressAutocompleteProps) {
  const [query, setQuery] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchSuggestions = async (val: string) => {
    if (!val || val.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: val,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        'accept-language': 'en',
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('Nominatim error');
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setIsOpen(data.length > 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    
    // Debounce
    const timer = setTimeout(() => fetchSuggestions(val), 300);
    return () => clearTimeout(timer);
  };

  const selectSuggestion = (s: NominatimResult) => {
    setQuery(s.display_name);
    onChange(s.display_name);
    if (onSelect) onSelect(s);
    setSuggestions([]);
    setIsOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-background shadow-xl"
          >
            <ul className="py-1 max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.place_id}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
