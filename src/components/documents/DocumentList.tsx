import React from 'react';
import { Document } from '@prisma/client';
import { useDocumentActions } from '@/lib/hooks/useDocumentActions';

interface DocumentListProps {
  documents: Document[];
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onSelect?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  emptyMessage?: string;
}

export function DocumentList({
  documents,
  isLoading = false,
  error = null,
  onRefresh,
  onSelect,
  onDelete,
  emptyMessage = 'No documents found',
}: DocumentListProps) {
  const { deleteDocument, loading: deleteLoading } = useDocumentActions({
    onSuccess: (action, _document) => {
      if (action === 'delete' && onDelete) {
        onDelete(_document.id);
      }
      if (onRefresh) {
        onRefresh();
      }
    },
  });

  const handleDelete = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(documentId);
    }
  };

  const getDocumentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'text/plain':
        return (
          <svg
            className="w-6 h-6 text-gray-400"
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
        );
      case 'application/pdf':
        return (
          <svg
            className="w-6 h-6 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      case 'text/markdown':
        return (
          <svg
            className="w-6 h-6 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6 text-gray-400"
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
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
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
        <p className="font-semibold">Error loading documents:</p>
        <p>{error.message}</p>
        {onRefresh && (
          <button
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-900"
            onClick={onRefresh}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
        {onRefresh && (
          <button
            type="button"
            className="mt-1 text-sm text-blue-600 hover:text-blue-500"
            onClick={onRefresh}
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {documents.map((document) => (
          <li key={document.id} className="relative">
            <div
              className={`block transition hover:bg-gray-50 ${onSelect ? 'cursor-pointer' : ''}`}
              onClick={() => onSelect && onSelect(document)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect && onSelect(document);
                }
              }}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
            >
              <div className="flex items-center px-4 py-4 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center">
                  <div className="flex-shrink-0">{getDocumentTypeIcon(document.contentType)}</div>
                  <div className="min-w-0 flex-1 px-4">
                    <div>
                      <p className="truncate text-sm font-medium text-blue-600">{document.title}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="truncate">{document.source || 'No source'}</span>
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <p className="text-xs">Updated: {formatDate(document.updatedAt)}</p>
                        <span className="mx-2">•</span>
                        {getStatusBadge(document.processingStatus)}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-transparent bg-red-100 p-1.5 text-red-600 shadow-sm hover:bg-red-200 focus:outline-none"
                    onClick={(e) => handleDelete(document.id, e)}
                    disabled={deleteLoading}
                    aria-label="Delete document"
                  >
                    <svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
