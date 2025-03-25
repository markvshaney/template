import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchHistory } from '@/components/search/SearchHistory';

describe('SearchHistory', () => {
  const mockOnSearchClick = jest.fn();
  const mockOnClearHistory = jest.fn();

  const defaultProps = {
    recentSearches: ['test query', 'react', 'typescript'],
    onSearchClick: mockOnSearchClick,
    onClearHistory: mockOnClearHistory,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders recent searches correctly', () => {
    render(<SearchHistory {...defaultProps} />);

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('test query')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  test('does not render anything if no recent searches', () => {
    const { container } = render(<SearchHistory {...defaultProps} recentSearches={[]} />);

    expect(container.firstChild).toBeNull();
  });

  test('clicking on a search item calls onSearchClick with the query', () => {
    render(<SearchHistory {...defaultProps} />);

    fireEvent.click(screen.getByText('react'));

    expect(mockOnSearchClick).toHaveBeenCalledWith('react');
  });

  test('clicking Clear All calls onClearHistory', () => {
    render(<SearchHistory {...defaultProps} />);

    fireEvent.click(screen.getByText('Clear All'));

    expect(mockOnClearHistory).toHaveBeenCalled();
  });

  test('disables buttons when isLoading is true', () => {
    render(<SearchHistory {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Clear All')).toBeDisabled();

    // Get all search item buttons (excluding Clear All)
    const searchItemButtons = screen
      .getAllByRole('button')
      .filter((button) => button.textContent !== 'Clear All');

    // Check that each search item button is disabled
    searchItemButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  test('does not show Clear All button if onClearHistory is not provided', () => {
    const { onClearHistory, ...propsWithoutClear } = defaultProps;

    render(<SearchHistory {...propsWithoutClear} />);

    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });
});
