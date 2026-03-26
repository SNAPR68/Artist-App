'use client';

import { useEffect, useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

interface Facet {
  value: string;
  count: number;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  facets: {
    genres: Facet[];
    cities: Facet[];
    event_types: Facet[];
    price_range: { min: number; max: number };
  } | null;
  genre: string;
  city: string;
  eventType: string;
  onGenreChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onEventTypeChange: (value: string) => void;
  onClearAll: () => void;
}

export function FilterDrawer({
  isOpen,
  onClose,
  facets,
  genre,
  city,
  eventType,
  onGenreChange,
  onCityChange,
  onEventTypeChange,
  onClearAll,
}: FilterDrawerProps) {
  const hasFilters = genre || city || eventType;
  const [mounted, setMounted] = useState(false);

  // Delay the "visible" state by a frame so the CSS transition triggers
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-[48] desktop:hidden transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[49] desktop:hidden bg-nocturne-base border-t border-nocturne-border rounded-t-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-out ${
          mounted ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-nocturne-text-secondary" />
              <h3 className="font-semibold text-nocturne-text-primary">Filters</h3>
            </div>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <button onClick={onClearAll} className="text-xs text-nocturne-accent">
                  Clear all
                </button>
              )}
              <button onClick={onClose} className="text-nocturne-text-secondary p-1">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <MobileFilterGroup title="Genre" items={facets?.genres ?? []} selected={genre} onSelect={(v) => { onGenreChange(v); }} />
            <MobileFilterGroup title="City" items={facets?.cities ?? []} selected={city} onSelect={(v) => { onCityChange(v); }} />
            <MobileFilterGroup title="Event Type" items={facets?.event_types ?? []} selected={eventType} onSelect={(v) => { onEventTypeChange(v); }} />
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-gradient-accent text-white font-semibold rounded-xl"
          >
            Show Results
          </button>
        </div>
      </div>
    </>
  );
}

function MobileFilterGroup({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: { value: string; count: number }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-nocturne-text-secondary uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((f) => (
          <button
            key={f.value}
            onClick={() => onSelect(selected === f.value ? '' : f.value)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              selected === f.value
                ? 'bg-nocturne-primary-light text-nocturne-accent border-nocturne-border'
                : 'text-nocturne-text-secondary border-nocturne-border hover:border-primary-500/20'
            }`}
          >
            {f.value}
          </button>
        ))}
      </div>
    </div>
  );
}
