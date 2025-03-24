import { useState, useCallback } from 'react';
import { SearchOptions, SearchResult } from '../search/types';

interface UseSearchProps {
  initialQuery?: string;
  initialProvider?: SearchOptions['provider'];
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
  search: (options?: Partial<SearchOptions>) => Promise<void>;
  clear: () => void;
}

export function useSearch({
  initialQuery = '',
  initialProvider = 'google',
}: UseSearchProps = {}): UseSearchReturn {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (options?: Partial<SearchOptions>) => {
      if (!query.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            options: {
              provider: initialProvider,
              ...options,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setResults(data.results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, initialProvider]
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clear,
  };
}
