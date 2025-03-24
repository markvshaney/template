'use client';

import React from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { useSearch } from '@/lib/hooks/useSearch';
import { SearchOptions } from '@/lib/search/types';

export default function SearchPage() {
  const { query, setQuery, results, loading, error, search } = useSearch();

  const handleSearch = async (searchQuery: string, options?: Partial<SearchOptions>) => {
    setQuery(searchQuery);
    await search(options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Web Search</h1>

        <div className="mb-8">
          <SearchBar
            onSearch={handleSearch}
            initialQuery={query}
            isLoading={loading}
            placeholder="Search the web..."
            providers={['google', 'brave', 'bing', 'duckduckgo']}
          />
        </div>

        <div>
          <SearchResults results={results} isLoading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}
