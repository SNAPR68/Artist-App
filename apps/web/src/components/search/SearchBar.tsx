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
          <div className="relative overflow-hidden rounded-2xl bg-white border border-neutral-200 shadow-sm p-1.5 focus-within:border-neutral-300 focus-within:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3 bg-neutral-50 rounded-xl px-4 py-3 focus-within:bg-white transition-colors">
              <Search
                size={18}
                className="text-neutral-400 shrink-0"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search for singers, DJs, bands..."
                aria-label="Search for artists"
                className="flex-1 bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          aria-label="Submit search"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
