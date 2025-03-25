import React from 'react';

interface SearchHistoryProps {
  recentSearches: string[];
  onSearchClick: (query: string) => void;
  onClearHistory?: () => void;
  isLoading?: boolean;
}

export function SearchHistory({
  recentSearches,
  onSearchClick,
  onClearHistory,
  isLoading = false,
}: SearchHistoryProps) {
  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-medium text-gray-700">Recent Searches</h2>
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="text-xs text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {recentSearches.map((search, index) => (
          <button
            key={`${search}-${index}`}
            onClick={() => onSearchClick(search)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors truncate max-w-xs"
            disabled={isLoading}
            title={search}
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
