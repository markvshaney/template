import React, { useState, KeyboardEvent, FormEvent } from 'react';
import { SearchOptions } from '@/lib/search/types';

interface SearchBarProps {
  onSearch: (query: string, options?: Partial<SearchOptions>) => void;
  initialQuery?: string;
  isLoading?: boolean;
  placeholder?: string;
  providers?: Array<SearchOptions['provider']>;
}

export function SearchBar({
  onSearch,
  initialQuery = '',
  isLoading = false,
  placeholder = 'Search the web...',
  providers = ['google', 'brave'],
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedProvider, setSelectedProvider] = useState<SearchOptions['provider']>('google');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, { provider: selectedProvider });
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query, { provider: selectedProvider });
      }
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            disabled={isLoading}
            aria-label="Search query"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as SearchOptions['provider'])}
            className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            disabled={isLoading}
            aria-label="Search provider"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Search"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
