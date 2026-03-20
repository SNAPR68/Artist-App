'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-[48] desktop:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[49] desktop:hidden bg-surface-base border-t border-glass-border rounded-t-2xl max-h-[80vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-text-muted" />
                  <h3 className="font-semibold text-text-primary">Filters</h3>
                </div>
                <div className="flex items-center gap-3">
                  {hasFilters && (
                    <button onClick={onClearAll} className="text-xs text-primary-400">
                      Clear all
                    </button>
                  )}
                  <button onClick={onClose} className="text-text-muted p-1">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
      <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((f) => (
          <button
            key={f.value}
            onClick={() => onSelect(selected === f.value ? '' : f.value)}
            className={`text-sm px-3 py-1.5 rounded-pill border transition-colors ${
              selected === f.value
                ? 'bg-primary-500/15 text-primary-300 border-primary-500/30'
                : 'text-text-secondary border-glass-border hover:border-primary-500/20'
            }`}
          >
            {f.value}
          </button>
        ))}
      </div>
    </div>
  );
}
