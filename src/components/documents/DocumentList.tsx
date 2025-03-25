import React, { useState, useEffect, useCallback } from 'react';
import { Document } from '@prisma/client';
import { useDocumentActions } from '@/lib/hooks/useDocumentActions';

interface DocumentItemProps {
  document: Document;
  onSelect?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
}

// Memo-ize the DocumentItem component to prevent unnecessary re-renders
const DocumentItem = React.memo(function DocumentItem({
  document,
  onSelect,
  onDelete,
}: DocumentItemProps) {
  // Use document actions hook for delete functionality
  const { deleteDocument, loading: deleteLoading } = useDocumentActions({
    onSuccess: (action) => {
      if (action === 'delete' && onDelete) {
        onDelete(document.id);
      }
    },
  });

  // Handle delete with confirmation
  const handleDelete = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteDocument(documentId);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative flex items-center px-4 py-5 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
      onClick={() => onSelect && onSelect(document)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect && onSelect(document);
        }
      }}
      aria-label={`View details for ${document.title}`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-blue-600">{document.title}</h3>
        <div className="mt-1 flex items-center text-xs text-gray-500">
          <span className="truncate">{document.source || 'No source'}</span>
          <span className="mx-1">•</span>
          <span>{new Date(document.createdAt).toLocaleString()}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{document.content}</p>
        {document.tagsString && (
          <div className="mt-2">
            {document.tagsString.split(',').map((tag) => (
              <span
                key={`${document.id}-${tag}`}
                className="inline-block bg-gray-100 px-2 py-0.5 text-xs rounded mr-1"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
      {onDelete && (
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1 text-gray-400 shadow-sm hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={(e) => handleDelete(document.id, e)}
            disabled={deleteLoading}
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => Promise<void>;
  onSelect?: (document: Document) => void;
  onDelete?: (documentId?: string) => void;
}

export function DocumentList({
  documents,
  isLoading = false,
  error = null,
  onRefresh,
  onSelect,
  onDelete,
}: DocumentListProps) {
  // Prevent extra renders by using a stable local state and reduced effects
  const [localLoading, setLocalLoading] = useState(false);

  // Use memo for stable callbacks
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setLocalLoading(true);
      try {
        await onRefresh();
      } finally {
        // Small delay before hiding loading state
        setTimeout(() => setLocalLoading(false), 500);
      }
    }
  }, [onRefresh]);

  // Only update loading state after a deliberate delay to prevent flickering
  useEffect(() => {
    let isMounted = true;

    if (isLoading && !localLoading) {
      // Delay showing loading state to prevent flicker on fast loads
      const timer = setTimeout(() => {
        if (isMounted) setLocalLoading(true);
      }, 500);
      return () => {
        clearTimeout(timer);
        isMounted = false;
      };
    } else if (!isLoading && localLoading) {
      // Add a small delay when transitioning from loading to not loading
      const timer = setTimeout(() => {
        if (isMounted) setLocalLoading(false);
      }, 300);
      return () => {
        clearTimeout(timer);
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isLoading, localLoading]);

  // For error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
        <h3 className="text-lg font-medium mb-2">Error loading documents</h3>
        <p className="mb-3">{error.message}</p>
        <button
          onClick={() => handleRefresh()}
          className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  // For loading state - but only if we don't have documents yet or explicit loading
  if (localLoading && (!documents || documents.length === 0)) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // For empty state
  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white p-8 text-center border border-gray-100 rounded-md">
        <p className="text-gray-500 mb-4">No documents found</p>
        <button
          onClick={() => handleRefresh()}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
        >
          Refresh
        </button>
      </div>
    );
  }

  // If we have documents, show them - even during loading
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      {localLoading && (
        <div className="p-2 bg-blue-50 text-blue-700 text-sm text-center">
          Refreshing documents...
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {documents.map((document) => (
          <DocumentItem
            key={document.id}
            document={document}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
