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
      <div className="glass-card p-4 space-y-4 sticky top-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-text-muted" />
            <h3 className="font-semibold text-text-primary text-sm">Filters</h3>
          </div>
          {hasFilters && (
            <button onClick={onClearAll} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              Clear all
            </button>
          )}
        </div>

        <FilterGroup
          title="Genre"
          items={facets?.genres ?? []}
          selected={genre}
          onSelect={onGenreChange}
        />

        <FilterGroup
          title="City"
          items={facets?.cities ?? []}
          selected={city}
          onSelect={onCityChange}
        />

        <FilterGroup
          title="Event Type"
          items={facets?.event_types ?? []}
          selected={eventType}
          onSelect={onEventTypeChange}
        />
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
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {items.map((f) => (
          <button
            key={f.value}
            onClick={() => onSelect(selected === f.value ? '' : f.value)}
            className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
              selected === f.value
                ? 'bg-primary-500/15 text-primary-300 border border-primary-500/20'
                : 'text-text-secondary hover:bg-glass-light'
            }`}
          >
            {f.value} <span className="text-text-muted text-xs">({f.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
