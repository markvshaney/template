import { useState, useEffect, useCallback } from 'react';
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
  error: Error | null;
  pagination: PaginationState;
  fetchDocuments: (options?: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    tags?: string[];
    includeChunks?: boolean;
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
  userId,
  onError,
}: UseDocumentsProps = {}): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentWithChunks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
  });

  // State for filtering
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState<string | undefined>();
  const [filterTags, setFilterTags] = useState<string[] | undefined>();
  const [includeChunks, setIncludeChunks] = useState(false);

  const fetchDocuments = useCallback(
    async (options?: {
      limit?: number;
      offset?: number;
      status?: string;
      search?: string;
      tags?: string[];
      includeChunks?: boolean;
    }) => {
      const {
        limit = pagination.limit,
        offset = pagination.offset,
        status = filterStatus,
        search = searchTerm,
        tags = filterTags,
        includeChunks: includeChunksOption = includeChunks,
      } = options || {};

      // Update state for filters
      setFilterStatus(status);
      setSearchTerm(search);
      setFilterTags(tags);
      setIncludeChunks(includeChunksOption);

      setLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());

        if (userId) {
          params.append('userId', userId);
        }

        if (status) {
          params.append('status', status);
        }

        if (search) {
          params.append('search', search);
        }

        if (tags && tags.length > 0) {
          params.append('tags', tags.join(','));
        }

        if (includeChunksOption) {
          params.append('includeChunks', 'true');
        }

        // Fetch documents
        const response = await fetch(`/api/documents?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }

        const data = await response.json();

        // Update state
        setDocuments(data.documents);
        setPagination(data.pagination);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.limit,
      pagination.offset,
      filterStatus,
      searchTerm,
      filterTags,
      includeChunks,
      userId,
      onError,
    ]
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
