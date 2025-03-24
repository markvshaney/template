import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/search/SearchBar';

describe('SearchBar Component', () => {
  const mockSearch = jest.fn();

  beforeEach(() => {
    mockSearch.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<SearchBar onSearch={mockSearch} />);

    expect(screen.getByPlaceholderText('Search the web...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar onSearch={mockSearch} placeholder="Custom placeholder" />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('displays initial query when provided', () => {
    render(<SearchBar onSearch={mockSearch} initialQuery="test query" />);

    expect(screen.getByRole('textbox')).toHaveValue('test query');
  });

  it('calls onSearch when search button is clicked', () => {
    render(<SearchBar onSearch={mockSearch} initialQuery="test query" />);

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSearch).toHaveBeenCalledWith('test query', { provider: 'google' });
  });

  it('calls onSearch when Enter is pressed', () => {
    render(<SearchBar onSearch={mockSearch} initialQuery="test query" />);

    fireEvent.keyPress(screen.getByRole('textbox'), { key: 'Enter', code: 13, charCode: 13 });

    expect(mockSearch).toHaveBeenCalledWith('test query', { provider: 'google' });
  });

  it('updates query on input change', () => {
    render(<SearchBar onSearch={mockSearch} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new query' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSearch).toHaveBeenCalledWith('new query', { provider: 'google' });
  });

  it('updates provider when select changes', () => {
    render(<SearchBar onSearch={mockSearch} initialQuery="test query" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'brave' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(mockSearch).toHaveBeenCalledWith('test query', { provider: 'brave' });
  });

  it('shows loading state when isLoading is true', () => {
    render(<SearchBar onSearch={mockSearch} isLoading={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('disables search button when query is empty', () => {
    render(<SearchBar onSearch={mockSearch} />);

    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new query' } });

    expect(screen.getByRole('button', { name: /search/i })).not.toBeDisabled();
  });
});
