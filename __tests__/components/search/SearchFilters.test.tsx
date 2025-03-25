import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilters, FilterOptions } from '@/components/search/SearchFilters';

describe('SearchFilters', () => {
  const mockOnFilterChange = jest.fn();
  const defaultProps = {
    onFilterChange: mockOnFilterChange,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the show/hide filters button', () => {
    render(<SearchFilters {...defaultProps} />);
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
  });

  test('shows filters when button is clicked', () => {
    render(<SearchFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Show Filters'));

    expect(screen.getByText('Hide Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Time Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Semantic Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Domain Filter')).toBeInTheDocument();
  });

  test('changing time range calls onFilterChange', () => {
    render(<SearchFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Show Filters'));

    const timeRangeSelect = screen.getByLabelText('Time Range');
    fireEvent.change(timeRangeSelect, { target: { value: 'day' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: 'day',
      })
    );
  });

  test('changing content type calls onFilterChange', () => {
    render(<SearchFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Show Filters'));

    const contentTypeSelect = screen.getByLabelText('Content Type');
    fireEvent.change(contentTypeSelect, { target: { value: 'article' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'article',
      })
    );
  });

  test('toggling semantic search calls onFilterChange', () => {
    render(<SearchFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Show Filters'));

    const semanticSearchCheckbox = screen.getByLabelText('Enable Semantic Search');
    fireEvent.click(semanticSearchCheckbox);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        semanticSearch: false,
      })
    );
  });

  test('submitting domain filter calls onFilterChange', () => {
    render(<SearchFilters {...defaultProps} />);
    fireEvent.click(screen.getByText('Show Filters'));

    const domainInput = screen.getByLabelText('Domain Filter');
    fireEvent.change(domainInput, { target: { value: 'example.com' } });
    fireEvent.submit(domainInput.closest('form')!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'example.com',
      })
    );
  });

  test('clearing domain filter calls onFilterChange', () => {
    const initialFilters: FilterOptions = {
      domain: 'example.com',
    };

    render(<SearchFilters {...defaultProps} initialFilters={initialFilters} />);
    fireEvent.click(screen.getByText('Show Filters'));

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
    expect(lastCall.domain).toBeUndefined();
  });

  test('disables all controls when isLoading is true', () => {
    render(<SearchFilters {...defaultProps} isLoading={true} />);
    fireEvent.click(screen.getByText('Show Filters'));

    expect(screen.getByLabelText('Time Range')).toBeDisabled();
    expect(screen.getByLabelText('Content Type')).toBeDisabled();
    expect(screen.getByLabelText('Sort By')).toBeDisabled();
    expect(screen.getByLabelText('Enable Semantic Search')).toBeDisabled();
    expect(screen.getByLabelText('Domain Filter')).toBeDisabled();
    expect(screen.getByText('Apply')).toBeDisabled();
  });
});
