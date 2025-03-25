import React, { useState, useCallback, useEffect } from 'react';

interface DocumentFiltersProps {
  onFilterChange: (filters: DocumentFilters) => void;
  initialFilters?: DocumentFilters;
  availableTags?: string[];
}

export interface DocumentFilters {
  status?: string;
  search?: string;
  tags?: string[];
}

export function DocumentFilters({
  onFilterChange,
  initialFilters = {},
  availableTags = [],
}: DocumentFiltersProps) {
  // Filter state
  const [status, setStatus] = useState<string | undefined>(initialFilters.status);
  const [search, setSearch] = useState<string | undefined>(initialFilters.search);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags || []);

  // Debounce search input
  const [searchInput, setSearchInput] = useState<string | undefined>(search);

  // Update filters when state changes
  const updateFilters = useCallback(() => {
    const filters: DocumentFilters = {};

    if (status) {
      filters.status = status;
    }

    if (search) {
      filters.search = search;
    }

    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }

    onFilterChange(filters);
  }, [status, search, selectedTags, onFilterChange]);

  // Handle search input with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Update filters when any filter changes
  useEffect(() => {
    updateFilters();
  }, [status, search, selectedTags, updateFilters]);

  // Reset all filters
  const handleReset = () => {
    setStatus(undefined);
    setSearch(undefined);
    setSearchInput(undefined);
    setSelectedTags([]);
  };

  // Toggle a tag in the selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="flex-1">
          <label htmlFor="document-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              name="document-search"
              id="document-search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search document title or content"
              value={searchInput || ''}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchInput(undefined)}
                aria-label="Clear search"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status filter */}
        <div className="sm:w-1/5">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            name="status-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={status || ''}
            onChange={(e) => setStatus(e.target.value || undefined)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Reset button */}
        <div className="sm:flex sm:items-end">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleReset}
          >
            <svg
              className="mr-2 -ml-1 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Tags</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <svg
                    className="ml-1.5 h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {(status || search || selectedTags.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Active Filters
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {status}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-3 w-3"
                  onClick={() => setStatus(undefined)}
                >
                  <span className="sr-only">Remove status filter</span>
                  <svg
                    className="h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {search}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-3 w-3"
                  onClick={() => {
                    setSearch(undefined);
                    setSearchInput(undefined);
                  }}
                >
                  <span className="sr-only">Remove search filter</span>
                  <svg
                    className="h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            )}
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                Tag: {tag}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-3 w-3"
                  onClick={() => toggleTag(tag)}
                >
                  <span className="sr-only">Remove tag filter</span>
                  <svg
                    className="h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
