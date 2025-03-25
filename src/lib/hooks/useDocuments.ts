import { useState, useEffect, useCallback, useRef } from 'react';
import { Document } from '@prisma/client';

interface DocumentWithChunks extends Document {
  chunks?: Array<{
    id: string;
    content: string;
    chunkIndex: number;
  }>;
}

interface PaginationState {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UseDocumentsProps {
  initialLimit?: number;
  initialOffset?: number;
  userId?: string;
  onError?: (error: Error) => void;
}

interface UseDocumentsReturn {
  documents: DocumentWithChunks[];
  loading: boolean;
  setLoading: (isLoading: boolean) => void;
  error: Error | null;
  pagination: PaginationState;
  fetchDocuments: (options?: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    tags?: string[];
  }) => Promise<void>;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToPage: (page: number) => void;
  refreshDocuments: () => Promise<void>;
}

export function useDocuments({
  initialLimit = 10,
  initialOffset = 0,
  userId = 'cm8nwyxk70000sgdgdws2ej0v',
  onError,
}: UseDocumentsProps = {}): UseDocumentsReturn {
  console.log('useDocuments hook initialized with userId:', userId);

  const [documents, setDocuments] = useState<DocumentWithChunks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
  });

  // Keep track of the latest request to prevent race conditions
  const latestRequestIdRef = useRef<number>(0);

  // State for filtering
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filterTags, setFilterTags] = useState<string[] | undefined>();

  const fetchDocuments = useCallback(
    async (options?: {
      limit?: number;
      offset?: number;
      status?: string;
      search?: string;
      tags?: string[];
    }) => {
      const {
        limit = pagination.limit,
        offset = pagination.offset,
        status = filterStatus,
        search = searchTerm,
        tags = filterTags,
      } = options || {};

      // Create a unique ID for this request to handle race conditions
      const requestId = ++latestRequestIdRef.current;

      // Update state for filters
      setFilterStatus(status);
      setSearchTerm(search);
      setFilterTags(tags);

      setLoading(true);
      setError(null);

      try {
        // Use the simplified API that directly queries the database
        const url = `/api/documents-basic`;
        console.log(`[Request ${requestId}] Fetching documents from:`, url);

        // Fetch documents
        const response = await fetch(url);
        console.log(`[Request ${requestId}] Response status:`, response.status);

        // Check if this is still the latest request
        if (requestId !== latestRequestIdRef.current) {
          console.log(`[Request ${requestId}] Abandoned - newer request in progress`);
          return; // Abandon this request as it's outdated
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }

        // Check if response is empty
        const responseText = await response.text();

        // Check again if this is still the latest request before processing
        if (requestId !== latestRequestIdRef.current) {
          console.log(
            `[Request ${requestId}] Abandoned during processing - newer request in progress`
          );
          return; // Abandon this request as it's outdated
        }

        if (!responseText || responseText.trim() === '') {
          console.error(`[Request ${requestId}] Empty response from server`);
          throw new Error('Empty response from server');
        }

        const data = JSON.parse(responseText);
        console.log(`[Request ${requestId}] API Response data:`, data);

        if (!data.documents) {
          console.error(`[Request ${requestId}] No documents property in API response:`, data);
          throw new Error('Invalid response from server: missing documents');
        }

        // Only update state if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          setDocuments(data.documents);
          setPagination({
            total: data.pagination?.total || 0,
            limit,
            offset,
            hasMore: data.pagination?.hasMore || false,
          });
        } else {
          console.log(`[Request ${requestId}] Abandoned at final step - newer request completed`);
        }
      } catch (err) {
        console.error(`[Request ${requestId}] Error in useDocuments:`, err);
        // Only update error state if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [pagination.limit, pagination.offset, filterStatus, searchTerm, filterTags, onError]
  );

  // Pagination helpers
  const hasNextPage = pagination.hasMore;
  const hasPreviousPage = pagination.offset > 0;

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      fetchDocuments({
        offset: pagination.offset + pagination.limit,
      });
    }
  }, [fetchDocuments, hasNextPage, pagination.limit, pagination.offset]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      fetchDocuments({
        offset: Math.max(0, pagination.offset - pagination.limit),
      });
    }
  }, [fetchDocuments, hasPreviousPage, pagination.limit, pagination.offset]);

  const goToPage = useCallback(
    (page: number) => {
      const newOffset = (page - 1) * pagination.limit;
      fetchDocuments({ offset: newOffset });
    },
    [fetchDocuments, pagination.limit]
  );

  const refreshDocuments = useCallback(() => {
    return fetchDocuments({
      offset: pagination.offset,
      limit: pagination.limit,
    });
  }, [fetchDocuments, pagination.limit, pagination.offset]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments({ limit: initialLimit, offset: initialOffset });
  }, [fetchDocuments, initialLimit, initialOffset]);

  return {
    documents,
    loading,
    setLoading,
    error,
    pagination,
    fetchDocuments,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refreshDocuments,
  };
}
