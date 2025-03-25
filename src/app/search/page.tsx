'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters, FilterOptions } from '@/components/search/SearchFilters';
import { SearchHistory } from '@/components/search/SearchHistory';
import { SearchService } from '@/lib/services/search-service';
import { SearchOptions, SearchResult } from '@/lib/search/types';
import { useSearch } from '@/lib/hooks/useSearch';

export default function SearchPage() {
  const { query, setQuery, results, loading, error, search } = useSearch();
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: 'all',
    contentType: 'all',
    sortBy: 'relevance',
    semanticSearch: true,
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [documentResults, setDocumentResults] = useState<SearchResult[]>([]);
  const [combinedResults, setCombinedResults] = useState<SearchResult[]>([]);
  const [resultTab, setResultTab] = useState<'combined' | 'web' | 'documents'>('combined');

  // Load recent searches on mount
  useEffect(() => {
    async function loadRecentSearches() {
      try {
        const searches = await SearchService.getRecentSearches();
        setRecentSearches(searches);
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }

    loadRecentSearches();
  }, []);

  const handleSearch = async (searchQuery: string, options?: Partial<SearchOptions>) => {
    setQuery(searchQuery);

    try {
      // Direct search API call for web results
      await search(options);

      // Use SearchService for combined results (web + documents)
      const searchResults = await SearchService.search(searchQuery, {
        provider: options?.provider,
        enableSemanticSearch: filters.semanticSearch,
        timeRange: filters.timeRange !== 'all' ? filters.timeRange : undefined,
      });

      setDocumentResults(searchResults.documentResults);
      setCombinedResults(searchResults.combinedResults);

      // Update recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches((prev) => [searchQuery, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);

    if (query) {
      handleSearch(query, {
        timeRange: newFilters.timeRange !== 'all' ? newFilters.timeRange : undefined,
      });
    }
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
  };

  const displayResults = () => {
    switch (resultTab) {
      case 'web':
        return <SearchResults results={results} isLoading={loading} error={error} query={query} />;
      case 'documents':
        return (
          <SearchResults
            results={documentResults}
            isLoading={loading}
            error={error}
            query={query}
          />
        );
      case 'combined':
      default:
        return (
          <SearchResults
            results={combinedResults.length > 0 ? combinedResults : results}
            isLoading={loading}
            error={error}
            query={query}
          />
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Search</h1>

        <div className="mb-4">
          <SearchBar
            onSearch={handleSearch}
            initialQuery={query}
            isLoading={loading}
            placeholder="Search web and documents..."
            providers={['google', 'brave', 'bing', 'duckduckgo']}
          />
        </div>

        <SearchHistory
          recentSearches={recentSearches}
          onSearchClick={handleSearch}
          onClearHistory={handleClearHistory}
          isLoading={loading}
        />

        <SearchFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
          isLoading={loading}
        />

        {/* Result tabs */}
        {(results.length > 0 || documentResults.length > 0) && (
          <div className="mb-4 border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Results Tabs">
              <button
                onClick={() => setResultTab('combined')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  resultTab === 'combined'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={resultTab === 'combined' ? 'page' : undefined}
              >
                All Results
              </button>
              <button
                onClick={() => setResultTab('web')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  resultTab === 'web'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={resultTab === 'web' ? 'page' : undefined}
              >
                Web
              </button>
              <button
                onClick={() => setResultTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  resultTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={resultTab === 'documents' ? 'page' : undefined}
                disabled={documentResults.length === 0}
              >
                Documents {documentResults.length > 0 && `(${documentResults.length})`}
              </button>
            </nav>
          </div>
        )}

        <div>{displayResults()}</div>
      </div>
    </div>
  );
}
