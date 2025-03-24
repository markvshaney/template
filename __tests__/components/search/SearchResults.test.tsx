import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchResult } from '@/lib/search/types';

describe('SearchResults Component', () => {
  const mockResults: SearchResult[] = [
    {
      title: 'Test Result 1',
      url: 'https://example.com/1',
      snippet: 'This is a test result snippet 1',
      position: 1,
      metadata: {},
    },
    {
      title: 'Test Result 2',
      url: 'https://example.com/2',
      snippet: 'This is a test result snippet 2',
      position: 2,
      metadata: {},
    },
  ];

  it('renders loading state when isLoading is true', () => {
    render(<SearchResults results={[]} isLoading={true} />);

    // Check for loading skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error message when error is provided', () => {
    const testError = new Error('Test error message');
    render(<SearchResults results={[]} error={testError} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders empty state when results array is empty', () => {
    render(<SearchResults results={[]} />);

    expect(
      screen.getByText('No results found. Please try a different search term.')
    ).toBeInTheDocument();
  });

  it('renders search results correctly', () => {
    render(<SearchResults results={mockResults} />);

    // Check if titles are rendered
    expect(screen.getByText('Test Result 1')).toBeInTheDocument();
    expect(screen.getByText('Test Result 2')).toBeInTheDocument();

    // Check if snippets are rendered
    expect(screen.getByText('This is a test result snippet 1')).toBeInTheDocument();
    expect(screen.getByText('This is a test result snippet 2')).toBeInTheDocument();

    // Check if links are rendered correctly
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/1');
    expect(links[1]).toHaveAttribute('href', 'https://example.com/2');

    // Check if position indicators are rendered
    expect(screen.getByText('Result #1')).toBeInTheDocument();
    expect(screen.getByText('Result #2')).toBeInTheDocument();
  });

  it('renders hostname from URL', () => {
    render(<SearchResults results={mockResults} />);

    expect(screen.getAllByText('example.com')).toHaveLength(2);
  });
});
