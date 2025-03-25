'use client';

import React, { useState } from 'react';
import { Document } from '@prisma/client';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import {
  DocumentFilters,
  DocumentFilters as DocumentFiltersType,
} from '@/components/documents/DocumentFilters';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload';

export default function DocumentsPage() {
  // State for selected document
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Filter state
  const [filters, setFilters] = useState<DocumentFiltersType>({});

  // Use custom hooks for document management
  const {
    documents,
    loading,
    error,
    pagination,
    fetchDocuments,
    goToNextPage,
    goToPreviousPage,
    refreshDocuments,
  } = useDocuments({
    initialLimit: 10,
    initialOffset: 0,
  });

  const {
    uploading: isUploading,
    processingDocuments: isProcessing,
    progress: uploadProgress,
    error: uploadError,
    uploadDocuments,
  } = useDocumentUpload({
    onSuccess: () => {
      refreshDocuments();
    },
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: DocumentFiltersType) => {
    setFilters(newFilters);

    fetchDocuments({
      status: newFilters.status,
      search: newFilters.search,
      tags: newFilters.tags,
      offset: 0, // Reset to first page
    });
  };

  // Get unique tags from all documents
  const getUniqueTags = () => {
    const tags = new Set<string>();

    documents.forEach((doc) => {
      if (doc.tagsString) {
        doc.tagsString.split(',').forEach((tag) => {
          if (tag.trim()) {
            tags.add(tag.trim());
          }
        });
      }
    });

    return Array.from(tags);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Document Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Filters */}
          <DocumentFilters
            onFilterChange={handleFilterChange}
            initialFilters={filters}
            availableTags={getUniqueTags()}
          />

          {/* Document List */}
          <DocumentList
            documents={documents}
            isLoading={loading}
            error={error}
            onRefresh={refreshDocuments}
            onSelect={setSelectedDocument}
            onDelete={() => refreshDocuments()}
          />

          {/* Pagination Controls */}
          {documents.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {pagination.offset + 1} to {pagination.offset + documents.length} of{' '}
                {pagination.total} documents
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={goToPreviousPage}
                  disabled={pagination.offset === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={goToNextPage}
                  disabled={!pagination.hasMore}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Document Upload Section */}
          <div className="bg-white p-4 border border-gray-200 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
            <DocumentUpload
              onUpload={uploadDocuments}
              isUploading={isUploading}
              isProcessing={isProcessing}
              progress={uploadProgress}
              error={uploadError}
            />
          </div>

          {/* Document Viewer */}
          {selectedDocument && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Document Details</h2>
              <DocumentViewer document={selectedDocument} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
