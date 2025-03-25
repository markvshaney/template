import React from 'react';
import { Document as PrismaDocument, Chunk as PrismaChunk } from '@prisma/client';

interface DocumentViewerProps {
  document: PrismaDocument;
  chunks?: PrismaChunk[];
  isLoading?: boolean;
  error?: Error | null;
}

export function DocumentViewer({
  document,
  chunks,
  isLoading = false,
  error = null,
}: DocumentViewerProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const renderContent = () => {
    if (chunks && chunks.length > 0) {
      // If chunks are available, render them with highlighting
      return (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Document Chunks</h3>
          <div className="space-y-4">
            {chunks.map((chunk) => (
              <div key={chunk.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-500">Chunk {chunk.chunkIndex + 1}</span>
                  {(chunk.isFirst || chunk.isLast) && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {chunk.isFirst && chunk.isLast
                        ? 'Only Chunk'
                        : chunk.isFirst
                          ? 'First Chunk'
                          : 'Last Chunk'}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-gray-700 text-sm font-mono">
                  {chunk.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Render full document content
      return (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Document Content</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <pre className="whitespace-pre-wrap text-gray-700 text-sm font-mono">
              {document.content}
            </pre>
          </div>
        </div>
      );
    }
  };

  const parseMetadata = () => {
    try {
      const metadata = JSON.parse(document.metadata as string);
      return (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Metadata</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const getTags = () => {
    if (!document.tagsString) return null;

    const tags = document.tagsString.split(',');

    if (!tags.length) return null;

    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <svg
          className="animate-spin h-8 w-8 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        <p className="font-semibold">Error loading document:</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">{document.title}</h2>
        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Created: {formatDate(document.createdAt)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
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
            Updated: {formatDate(document.updatedAt)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Type: {document.contentType}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Status: {document.processingStatus}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        {renderContent()}
        {getTags()}
        {parseMetadata()}
      </div>
    </div>
  );
}
