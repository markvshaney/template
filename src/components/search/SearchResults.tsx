import React from 'react';
import { SearchResult } from '@/lib/search/types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: Error | null;
}

export function SearchResults({ results, isLoading = false, error = null }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-500">
        <p className="font-semibold">Error:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-4 text-gray-500">
        <p>No results found. Please try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {results.map((result, index) => (
        <div
          key={`${result.url}-${index}`}
          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
        >
          <h3 className="text-lg font-semibold mb-2">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {result.title}
            </a>
          </h3>
          <p className="text-gray-700 mb-2">{result.snippet}</p>
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <span>{new URL(result.url).hostname}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
            <span>Result #{result.position}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
