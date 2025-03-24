import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetrievalResults } from '@/components/rag/RetrievalResults';
import { RetrievalResult } from '@/lib/rag/retrieval';
import { DocumentChunk } from '@/lib/rag/document-processing';

describe('RetrievalResults Component', () => {
  // Create mock document chunks
  const createMockChunk = (id: string, index: number): DocumentChunk => ({
    id,
    documentId: `doc-${index}`,
    content: `This is the content of chunk ${index}`,
    startPosition: 0,
    endPosition: 100,
    metadata: {
      title: `Chunk ${index}`,
      documentType: 'text',
      chunkIndex: index,
    },
  });

  // Create mock retrieval result
  const mockRetrievalResult: RetrievalResult = {
    context: 'Combined context from chunks',
    results: [
      {
        id: 'chunk-1',
        documentId: 'doc-1',
        chunk: createMockChunk('chunk-1', 1),
        score: 0.95,
      },
      {
        id: 'chunk-2',
        documentId: 'doc-2',
        chunk: createMockChunk('chunk-2', 2),
        score: 0.85,
      },
    ],
    sources: [
      {
        id: 'doc-1',
        title: 'Document 1',
        url: 'https://example.com/doc1',
      },
      {
        id: 'doc-2',
        title: 'Document 2',
      },
    ],
  };

  it('renders loading skeleton when isLoading is true', () => {
    render(<RetrievalResults isLoading={true} />);

    // Check for loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no results are provided', () => {
    render(<RetrievalResults />);

    expect(screen.getByText(/No relevant context found/)).toBeInTheDocument();
  });

  it('renders retrieval results correctly', () => {
    render(<RetrievalResults retrievalResult={mockRetrievalResult} />);

    // Check heading and count
    expect(screen.getByText('Retrieved Context')).toBeInTheDocument();
    expect(screen.getByText(/2 relevant chunks found/)).toBeInTheDocument();

    // Check chunk headings are displayed
    expect(screen.getByText('Chunk 1')).toBeInTheDocument();
    expect(screen.getByText('Chunk 2')).toBeInTheDocument();

    // Check relevance scores
    expect(screen.getByText('Relevance: 95.0%')).toBeInTheDocument();
    expect(screen.getByText('Relevance: 85.0%')).toBeInTheDocument();
  });

  it('expands chunk content when clicked', () => {
    render(<RetrievalResults retrievalResult={mockRetrievalResult} />);

    // Initially, content should not be visible
    expect(screen.queryByText('This is the content of chunk 1')).not.toBeInTheDocument();

    // Click on the first chunk to expand it
    fireEvent.click(screen.getByText('Chunk 1'));

    // Now content should be visible
    expect(screen.getByText('This is the content of chunk 1')).toBeInTheDocument();
    expect(screen.getByText('Type: text')).toBeInTheDocument();
    expect(screen.getByText('Position: 2')).toBeInTheDocument();
  });

  it('renders source references when available', () => {
    render(<RetrievalResults retrievalResult={mockRetrievalResult} />);

    // Check sources section
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();

    // Check link in first source
    const link = screen.getByText('(link)');
    expect(link).toHaveAttribute('href', 'https://example.com/doc1');
  });

  it('hides sources when showSources is false', () => {
    render(<RetrievalResults retrievalResult={mockRetrievalResult} showSources={false} />);

    // Sources should not be displayed
    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });
});
