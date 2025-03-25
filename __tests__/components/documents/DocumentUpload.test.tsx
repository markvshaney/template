import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentUpload } from '@/components/documents/DocumentUpload';

describe('DocumentUpload', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('renders the component correctly', () => {
    render(<DocumentUpload onUpload={mockOnUpload} />);

    // Check basic elements
    expect(screen.getByText('Drag and drop your documents')).toBeInTheDocument();
    expect(screen.getByText(/or click to select files/i)).toBeInTheDocument();
    expect(screen.getByText(/accepted file types/i)).toBeInTheDocument();
  });

  it('shows uploading state when isUploading is true', () => {
    render(<DocumentUpload onUpload={mockOnUpload} isUploading={true} progress={50} />);

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('Uploading documents...')).toBeInTheDocument();

    // Verify progress bar exists
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('shows processing state when isProcessing is true', () => {
    render(<DocumentUpload onUpload={mockOnUpload} isProcessing={true} progress={75} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Processing documents...')).toBeInTheDocument();

    // Verify progress bar exists
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('displays error message when provided', () => {
    const error = new Error('Test error message');
    render(<DocumentUpload onUpload={mockOnUpload} error={error} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('handles file selection via file input', () => {
    // Mock the File object since it's not available in Jest environment
    const mockFile = new File(['test file content'], 'test.txt', { type: 'text/plain' });

    render(<DocumentUpload onUpload={mockOnUpload} />);

    // Get the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection
    const files = [mockFile];
    Object.defineProperty(fileInput, 'files', {
      value: files,
    });

    fireEvent.change(fileInput);

    // Check if onUpload was called with the correct file
    expect(mockOnUpload).toHaveBeenCalledTimes(1);
    expect(mockOnUpload).toHaveBeenCalledWith(files);
  });

  it('prevents selection when maxFiles is exceeded', () => {
    // Mock multiple files
    const mockFiles = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
      new File(['content3'], 'file3.txt', { type: 'text/plain' }),
    ];

    render(<DocumentUpload onUpload={mockOnUpload} maxFiles={2} />);

    // Get the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection with too many files
    Object.defineProperty(fileInput, 'files', {
      value: mockFiles,
    });

    fireEvent.change(fileInput);

    // Check that onUpload was not called
    expect(mockOnUpload).not.toHaveBeenCalled();

    // Check for validation error
    expect(screen.getByText(/too many files/i)).toBeInTheDocument();
  });

  it('prevents selection when file type is not allowed', () => {
    // Mock file with invalid extension
    const mockFile = new File(['content'], 'file.exe', { type: 'application/octet-stream' });

    render(<DocumentUpload onUpload={mockOnUpload} acceptedFileTypes={['.pdf', '.txt']} />);

    // Get the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection with invalid file
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
    });

    fireEvent.change(fileInput);

    // Check that onUpload was not called
    expect(mockOnUpload).not.toHaveBeenCalled();

    // Check for validation error
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
  });

  it('prevents selection when file size exceeds maximum', () => {
    // Mock large file
    const mockFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });

    render(<DocumentUpload onUpload={mockOnUpload} maxFileSizeMB={1} />);

    // Get the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate file selection with large file
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
    });

    fireEvent.change(fileInput);

    // Check that onUpload was not called
    expect(mockOnUpload).not.toHaveBeenCalled();

    // Check for validation error
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });
});
