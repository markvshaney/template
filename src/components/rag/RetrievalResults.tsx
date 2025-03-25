import React, { useState, KeyboardEvent } from 'react';
import { RetrievalResult } from '@/lib/rag/retrieval';
import { VectorSearchResult } from '@/lib/rag/vector-store';

interface RetrievalResultsProps {
  retrievalResult?: RetrievalResult;
  isLoading?: boolean;
  showSources?: boolean;
}

export function RetrievalResults({
  retrievalResult,
  isLoading = false,
  showSources = true,
}: RetrievalResultsProps) {
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});

  const toggleChunk = (id: string) => {
    setExpandedChunks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-20 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!retrievalResult || retrievalResult.results.length === 0) {
    return (
      <div className="py-4 text-gray-500">
        <p>No relevant context found. Please try a different query or upload more documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">Retrieved Context</h3>
        <p className="text-sm text-gray-500">
          {retrievalResult.results.length} relevant chunks found
        </p>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {retrievalResult.results.map((result: VectorSearchResult, index: number) => (
          <div
            key={`${result.chunk.id}-${index}`}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div
              className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
              onClick={() => toggleChunk(result.chunk.id)}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleChunk(result.chunk.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={!!expandedChunks[result.chunk.id]}
              aria-controls={`chunk-content-${result.chunk.id}`}
            >
              <div>
                <span className="font-medium">
                  {result.chunk.metadata.title || `Chunk ${index + 1}`}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  Relevance: {(result.score * 100).toFixed(1)}%
                </span>
              </div>
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  expandedChunks[result.chunk.id] ? 'rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {expandedChunks[result.chunk.id] && (
              <div className="p-4">
                <div className="whitespace-pre-wrap bg-white p-3 rounded border border-gray-100 mb-2 text-gray-800">
                  {result.chunk.content}
                </div>

                {/* Metadata */}
                <div className="mt-2 text-sm text-gray-500">
                  {result.chunk.metadata.documentType && (
                    <span className="mr-3">Type: {result.chunk.metadata.documentType}</span>
                  )}
                  {result.chunk.metadata.chunkIndex !== undefined && (
                    <span className="mr-3">Position: {result.chunk.metadata.chunkIndex + 1}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sources */}
      {showSources && retrievalResult.sources && retrievalResult.sources.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h4 className="text-md font-semibold mb-2">Sources</h4>
          <ul className="space-y-2">
            {retrievalResult.sources.map((source, index) => (
              <li key={`${source.id}-${index}`} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-400">{index + 1}.</span>
                <span>
                  {source.title || 'Untitled Document'}
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      (link)
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
