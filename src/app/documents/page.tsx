'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document } from '@prisma/client';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import {
  DocumentFilters,
  DocumentFilters as DocumentFiltersType,
} from '@/components/documents/DocumentFilters';
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload';

// Define the pagination interface
interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function DocumentsPage() {
  // State for documents, loading, and error handling
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchId, setFetchId] = useState<string>(''); // Track the current fetch
  const [fetchAttempted, setFetchAttempted] = useState(false); // Track if fetch has been attempted
  const [stableDocuments, setStableDocuments] = useState<Document[]>([]); // Stable reference for documents

  // State for selected document
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Filter state
  const [filters, setFilters] = useState<DocumentFiltersType>({});

  // Prevent multiple fetches
  const hasLoadedRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a flag to completely stop retries after multiple severe errors
  const [stopRetries, setStopRetries] = useState(false);
  const errorCountRef = useRef(0);

  // Fetch documents on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      console.log('Initial document fetch');
      fetchDocuments();
      hasLoadedRef.current = true;
    }

    // Clean up any pending fetches on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Use our guaranteed API endpoint with multiple potential port fallbacks
  const getApiUrls = () => {
    // Use current window location as base
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // Create a list of potential URLs to try (different ports and endpoints)
    return [
      // Current port with both endpoints
      `${protocol}//${hostname}:${window.location.port}/api/docs`,
      `${protocol}//${hostname}:${window.location.port}/api/documents-basic`,

      // Try specific ports that might be running the server
      `${protocol}//${hostname}:3001/api/docs`,
      `${protocol}//${hostname}:3002/api/docs`,
      `${protocol}//${hostname}:3000/api/docs`,

      // Last resort - basic endpoints on various ports
      `${protocol}//${hostname}:3001/api/documents-basic`,
      `${protocol}//${hostname}:3002/api/documents-basic`,
      `${protocol}//${hostname}:3000/api/documents-basic`,
    ];
  };

  // Try fetching from multiple potential URLs
  const tryFetchFromMultipleUrls = async (urls: string[], options: RequestInit) => {
    let lastError = null;

    // Try each URL in sequence
    for (const url of urls) {
      try {
        console.log(`Trying API URL: ${url}`);
        const response = await fetch(url, options);

        if (response.ok) {
          console.log(`Success with URL: ${url}`);
          return { response, successUrl: url };
        }

        console.log(`Failed with URL ${url}: ${response.status} ${response.statusText}`);
        lastError = new Error(`API returned status ${response.status}: ${response.statusText}`);
      } catch (err) {
        console.log(`Error with URL ${url}:`, err);
        lastError = err;
      }
    }

    // If we get here, all URLs failed
    throw lastError || new Error('All API endpoints failed');
  };

  // Direct fetch function similar to what's working in simple page
  const fetchDocuments = async () => {
    // Stop if we're in retry-stop mode
    if (stopRetries) {
      console.log('Fetch attempts stopped due to multiple severe errors');
      return;
    }

    // Debounce fetch requests - prevent multiple rapid fetches
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      // Increased to 2 seconds to reduce frequency
      console.log('Fetch request debounced - too soon after last fetch');

      // Clear any existing timeout and set a new one
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Schedule a single fetch after the debounce period
      debounceTimeoutRef.current = setTimeout(() => {
        console.log('Executing debounced fetch');
        fetchDocuments();
      }, 3000); // Increased to 3 seconds

      return;
    }

    // Don't run multiple fetches simultaneously
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping');
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;

      // Generate unique ID for this fetch
      const currentFetchId = now.toString();
      console.log('Main page: Starting document fetch with ID:', currentFetchId);
      setFetchId(currentFetchId);

      // Don't clear documents when starting a new fetch - prevents flickering
      setLoading(true);
      setFetchAttempted(true); // Mark that we've attempted a fetch

      const urls = getApiUrls();
      const requestOptions = {
        method: 'GET',
        cache: 'no-store' as RequestCache,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      };

      // Try all potential URLs
      const { response, successUrl } = await tryFetchFromMultipleUrls(urls, requestOptions);

      // Reset error counter on success
      errorCountRef.current = 0;

      // If this isn't the latest fetch, abort
      if (fetchId !== currentFetchId) {
        console.log('Main page: Fetch aborted - newer fetch in progress', {
          current: currentFetchId,
          latest: fetchId,
        });
        return;
      }

      console.log('Main page: Fetch response received', {
        status: response.status,
        statusText: response.statusText,
        fetchId: currentFetchId,
        successUrl,
      });

      // Read response as text first for better debugging
      const text = await response.text();
      console.log('Raw API response length:', text.length);

      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parsing error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }

      // Print out the incoming documents
      console.log('Main page: Document data details:', {
        count: data.documents.length,
        firstDocument: data.documents[0]
          ? {
              id: data.documents[0].id,
              title: data.documents[0].title,
              contentLength: data.documents[0].content.length,
              tags: data.documents[0].tagsString,
            }
          : 'No documents',
      });

      if (!data || !data.documents) {
        throw new Error('No documents property in response');
      }

      // Always update state - we don't need to check current fetch ID again
      // because we already checked it earlier and we know this is the latest fetch
      setStableDocuments(data.documents);
      setDocuments(data.documents);
      setPagination(
        data.pagination || {
          total: data.documents.length,
          limit: 10,
          offset: 0,
          hasMore: false,
        }
      );
      setError(null);
      console.log('Main page: Successfully loaded', data.documents.length, 'documents');
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err : new Error(String(err)));

      // Check for a 404 error and increment error counter
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('404') || errorMessage.includes('status 404')) {
        errorCountRef.current += 1;
        console.log(`Error count: ${errorCountRef.current}`);

        // After 3 consecutive 404 errors, stop retrying
        if (errorCountRef.current >= 3) {
          console.log('Multiple 404 errors detected - stopping automatic retries');
          setStopRetries(true);
          setError(
            new Error(
              'API endpoint not found after multiple attempts. Please check server configuration or restart the application.'
            )
          );
        }
      }

      // Don't clear documents on error - prevents flickering
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Refresh documents helper function
  const refreshDocuments = () => {
    return fetchDocuments();
  };

  // Use custom hooks for document upload
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

    // Will be implemented in a future update
    console.log('Filtering with:', newFilters);
    refreshDocuments();
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

  // Add debugging info when documents change
  useEffect(() => {
    console.log('Main page state update:', {
      documentCount: documents.length,
      stableDocumentsCount: stableDocuments.length,
      isLoading,
      hasError: !!error,
      fetchAttempted,
    });
  }, [documents, stableDocuments, isLoading, error, fetchAttempted]);

  // Document List - use stable documents if we have them, otherwise use regular documents state
  const displayDocuments = documents.length > 0 ? documents : stableDocuments;

  // Reset error state and allow retries again
  const resetErrorState = () => {
    errorCountRef.current = 0;
    setStopRetries(false);
    setError(null);
    console.log('Error state reset, retries enabled');
    fetchDocuments();
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

          {/* Loading status */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isLoading
                ? 'Loading documents...'
                : `Found ${displayDocuments ? displayDocuments.length : 0} documents. 
                   Raw: ${documents ? documents.length : 0}, 
                   Stable: ${stableDocuments ? stableDocuments.length : 0}`}
              {error && ` Error: ${error.message}`}
            </p>
            {stopRetries && (
              <button
                onClick={resetErrorState}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Reset & Retry
              </button>
            )}
          </div>

          {/* Document List */}
          {fetchAttempted && (
            <DocumentList
              documents={displayDocuments || []}
              isLoading={isLoading}
              error={error}
              onRefresh={fetchDocuments}
              onSelect={(document) => {
                console.log('Document selected:', document.id);
                setSelectedDocument(document);
              }}
              onDelete={() => {
                console.log('Document deleted, refreshing list');
                fetchDocuments();
              }}
            />
          )}

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
                  onClick={() => {
                    if (pagination.offset > 0) {
                      // Will be implemented in a future update
                      console.log('Previous page clicked');
                    }
                  }}
                  disabled={pagination.offset === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (pagination.hasMore) {
                      // Will be implemented in a future update
                      console.log('Next page clicked');
                    }
                  }}
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
