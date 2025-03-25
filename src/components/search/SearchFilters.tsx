import React, { useState } from 'react';

export type FilterOptions = {
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  contentType?: 'all' | 'article' | 'video' | 'image' | 'document';
  domain?: string;
  sortBy?: 'relevance' | 'date' | 'popularity';
  semanticSearch?: boolean;
};

interface SearchFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
  isLoading?: boolean;
}

export function SearchFilters({
  onFilterChange,
  initialFilters = {},
  isLoading = false,
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: 'all',
    contentType: 'all',
    sortBy: 'relevance',
    semanticSearch: true,
    ...initialFilters,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [domainInput, setDomainInput] = useState(filters.domain || '');

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedFilters = { ...filters, domain: domainInput };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearDomain = () => {
    setDomainInput('');
    const updatedFilters = { ...filters };
    delete updatedFilters.domain;
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center mb-2 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        disabled={isLoading}
        aria-expanded={showFilters}
        aria-controls="search-filters"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {showFilters && (
        <div
          id="search-filters"
          className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Time Range Filter */}
            <div>
              <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                id="timeRange"
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                disabled={isLoading}
              >
                <option value="all">All Time</option>
                <option value="day">Past 24 Hours</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>

            {/* Content Type Filter */}
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                id="contentType"
                value={filters.contentType}
                onChange={(e) => handleFilterChange('contentType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                disabled={isLoading}
              >
                <option value="all">All Types</option>
                <option value="article">Articles</option>
                <option value="video">Videos</option>
                <option value="image">Images</option>
                <option value="document">Documents</option>
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                disabled={isLoading}
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>

            {/* Semantic Search Toggle */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Search Mode</span>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="semanticSearch"
                  checked={filters.semanticSearch}
                  onChange={(e) => handleFilterChange('semanticSearch', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <label htmlFor="semanticSearch" className="ml-2 text-sm text-gray-700">
                  Enable Semantic Search
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Uses AI to find semantically similar content
              </p>
            </div>
          </div>

          {/* Domain Filter */}
          <div className="mt-4">
            <label htmlFor="domainFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Domain Filter
            </label>
            <form onSubmit={handleDomainSubmit} className="flex">
              <input
                id="domainFilter"
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g., example.com"
                className="flex-grow p-2 border border-gray-300 rounded-l-md text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 rounded-r-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                Apply
              </button>
              {filters.domain && (
                <button
                  type="button"
                  onClick={clearDomain}
                  className="ml-2 bg-gray-200 text-gray-700 px-3 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  Clear
                </button>
              )}
            </form>
            {filters.domain && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filters.domain}
                  <button
                    type="button"
                    onClick={clearDomain}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    aria-label="Remove domain filter"
                  >
                    &times;
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
