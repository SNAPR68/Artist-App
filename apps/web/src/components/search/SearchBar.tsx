'use client';

import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex gap-2 max-w-2xl">
        <div className="flex-1 relative">
          <div className="relative overflow-hidden rounded-2xl bg-nocturne-surface border border-nocturne-border shadow-sm p-1.5 focus-within:border-nocturne-border/80 focus-within:shadow-nocturne-card transition-all duration-200">
            <div className="flex items-center gap-3 bg-nocturne-surface-2 rounded-xl px-4 py-3 focus-within:bg-nocturne-surface transition-colors">
              <Search
                size={18}
                className="text-nocturne-text-tertiary shrink-0"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search for singers, DJs, bands..."
                aria-label="Search for artists"
                className="flex-1 bg-transparent text-sm font-medium text-nocturne-text-primary placeholder:text-nocturne-text-tertiary focus:outline-none"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          aria-label="Submit search"
          className="px-6 py-3 bg-nocturne-primary hover:bg-nocturne-primary-hover text-nocturne-text-primary text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
