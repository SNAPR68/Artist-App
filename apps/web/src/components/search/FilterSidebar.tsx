'use client';

import { SlidersHorizontal } from 'lucide-react';

interface Facet {
  value: string;
  count: number;
}

interface FilterSidebarProps {
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

export function FilterSidebar({
  facets,
  genre,
  city,
  eventType,
  onGenreChange,
  onCityChange,
  onEventTypeChange,
  onClearAll,
}: FilterSidebarProps) {
  const hasFilters = genre || city || eventType;

  return (
    <aside className="w-56 shrink-0 hidden desktop:block">
      <div className="glass-card border border-nocturne-border rounded-2xl p-6 space-y-6 sticky top-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={16} className="text-nocturne-text-secondary" />
            <h3 className="font-semibold text-nocturne-text-primary text-sm">Filters</h3>
          </div>
          {hasFilters && (
            <button
              onClick={onClearAll}
              aria-label="Clear all filters"
              className="text-xs text-nocturne-text-secondary hover:text-nocturne-text-primary transition-colors duration-200 font-medium"
            >
              Reset
            </button>
          )}
        </div>

        <div role="group" aria-label="Genre filters">
          <FilterGroup
            title="Genre"
            items={facets?.genres ?? []}
            selected={genre}
            onSelect={onGenreChange}
          />
        </div>

        <div role="group" aria-label="City filters">
          <FilterGroup
            title="City"
            items={facets?.cities ?? []}
            selected={city}
            onSelect={onCityChange}
          />
        </div>

        <div role="group" aria-label="Event type filters">
          <FilterGroup
            title="Event Type"
            items={facets?.event_types ?? []}
            selected={eventType}
            onSelect={onEventTypeChange}
          />
        </div>
      </div>
    </aside>
  );
}

function FilterGroup({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Facet[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-nocturne-text-primary uppercase tracking-wide mb-3">{title}</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((f) => (
          <button
            key={f.value}
            onClick={() => onSelect(selected === f.value ? '' : f.value)}
            className={`block w-full text-left text-sm px-4 py-2 rounded-xl border transition-all duration-200 ${
              selected === f.value
                ? 'bg-nocturne-primary text-nocturne-text-primary border-nocturne-primary'
                : 'text-nocturne-text-secondary border-nocturne-border hover:border-nocturne-primary/50 hover:text-nocturne-primary hover:bg-nocturne-primary/10'
            }`}
          >
            {f.value} <span className={selected === f.value ? 'text-nocturne-text-primary/70 text-xs' : 'text-nocturne-text-tertiary text-xs'}>({f.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
