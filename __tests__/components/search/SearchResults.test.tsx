import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchResult } from '@/lib/search/types';

describe('SearchResults', () => {
  const mockResults: SearchResult[] = [
    {
      title: 'Test Result 1',
      url: 'https://example.com/1',
      snippet: 'This is a sample test result with important keywords.',
      position: 1,
      metadata: {
        publishDate: '2023-03-15T12:00:00Z',
        contentType: 'article',
      },
    },
    {
      title: 'Test Result 2',
      url: 'https://example.com/2',
      snippet:
        'Another result with different content. This has a longer snippet that should be truncated when not expanded. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam.',
      position: 2,
    },
    {
      title: 'Document Test',
      url: 'document://123/456',
      snippet: 'This is a document result from the RAG system.',
      position: 3,
      metadata: {
        source: 'document',
        documentId: '123',
        chunkId: '456',
      },
    },
  ];

  test('renders search results correctly', () => {
    render(<SearchResults results={mockResults} />);

    expect(screen.getByText('Test Result 1')).toBeInTheDocument();
    expect(screen.getByText('Test Result 2')).toBeInTheDocument();
    expect(screen.getByText('Document Test')).toBeInTheDocument();
    expect(screen.getByText(/This is a sample test result/)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<SearchResults results={[]} isLoading={true} />);

    // Check for loading indicators
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('shows error message', () => {
    const error = new Error('Failed to load results');
    render(<SearchResults results={[]} error={error} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Failed to load results')).toBeInTheDocument();
  });

  test('shows empty state', () => {
    render(<SearchResults results={[]} />);

    expect(
      screen.getByText('No results found. Please try a different search term.')
    ).toBeInTheDocument();
  });

  test('highlights search terms in results', () => {
    render(<SearchResults results={mockResults} query="important keywords" />);

    // The mark elements should be rendered for matched terms
    const highlights = document.querySelectorAll('mark');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights[0].textContent).toBe('important');
    expect(highlights[1].textContent).toBe('keywords');
  });

  test('expands and collapses long snippets', () => {
    render(<SearchResults results={mockResults} />);

    // Find the "Show more" button for the long snippet
    const showMoreButton = screen.getByText('Show more');
    expect(showMoreButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(showMoreButton);
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Show less'));
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  test('shows content type badge for results with type', () => {
    render(<SearchResults results={mockResults} />);

    expect(screen.getByText('article')).toBeInTheDocument();
  });

  test('shows "Local" badge for document results', () => {
    render(<SearchResults results={mockResults} />);

    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  test('formats and displays date when available', () => {
    render(<SearchResults results={mockResults} />);

    expect(screen.getByText('Mar 15, 2023')).toBeInTheDocument();
  });
});
