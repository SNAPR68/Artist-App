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
      <div className="flex gap-2 animate-fade-in-up">
        <div className="flex-1 relative group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-400 transition-colors"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search for singers, DJs, bands..."
            aria-label="Search for artists"
            className="w-full pl-11 pr-4 py-3.5 bg-glass-light border border-glass-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 focus:shadow-glow-sm transition-all"
          />
        </div>
        <button
          type="submit"
          aria-label="Submit search"
          className="px-6 py-3.5 bg-gradient-accent hover:bg-gradient-accent-hover text-white text-sm font-semibold rounded-xl transition-all hover-glow hover:scale-[1.02] active:scale-[0.98]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
