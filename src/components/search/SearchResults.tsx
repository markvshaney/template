import React, { useState, ReactNode } from 'react';
import { SearchResult } from '@/lib/search/types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: Error | null;
  query?: string;
}

export function SearchResults({
  results,
  isLoading = false,
  error = null,
  query = '',
}: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const toggleExpand = (resultId: string) => {
    setExpandedResults((prev) => ({
      ...prev,
      [resultId]: !prev[resultId],
    }));
  };

  // Function to highlight search terms in text
  const highlightText = (text: string, searchQuery: string): ReactNode => {
    if (!searchQuery.trim()) return text;

    const terms = searchQuery
      .split(/\s+/)
      .filter((term) => term.length > 2)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars

    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');

    return text.split(regex).map((part, i) => {
      if (regex.test(part)) {
        return (
          <mark key={i} className="bg-yellow-100 px-0.5">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (e) {
      return '';
    }
  };

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
      <p className="text-sm text-gray-500">{results.length} results found</p>

      {results.map((result, index) => {
        const resultId = `${result.url}-${index}`;
        const isExpanded = expandedResults[resultId] || false;
        const isDocument = result.metadata?.source === 'document';
        const contentType = result.metadata?.contentType || (isDocument ? 'document' : 'web');
        const publishDate = formatDate(result.metadata?.publishDate as string);

        return (
          <div
            key={resultId}
            className={`border border-gray-200 rounded-lg p-4 transition-all ${
              isExpanded ? 'shadow-md' : 'hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold mb-2">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {highlightText(result.title, query)}
                </a>
              </h3>
              <div className="flex space-x-1">
                {contentType && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {contentType}
                  </span>
                )}
                {isDocument && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    Local
                  </span>
                )}
              </div>
            </div>

            <div className={`text-gray-700 mb-2 ${isExpanded ? '' : 'line-clamp-3'}`}>
              {highlightText(result.snippet, query)}
            </div>

            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <span>{new URL(result.url).hostname}</span>
              {publishDate && (
                <>
                  <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
                  <span>{publishDate}</span>
                </>
              )}
              <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
              <span>Result #{result.position}</span>

              {result.snippet.length > 150 && (
                <>
                  <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
                  <button
                    onClick={() => toggleExpand(resultId)}
                    className="text-blue-500 hover:underline"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
