import React, { useState, useRef, ChangeEvent, DragEvent, KeyboardEvent } from 'react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  isProcessing?: boolean;
  progress?: number;
  error?: Error | null;
  acceptedFileTypes?: string[];
  maxFileSizeMB?: number;
  maxFiles?: number;
}

export function DocumentUpload({
  onUpload,
  isUploading = false,
  isProcessing = false,
  progress = 0,
  error = null,
  acceptedFileTypes = ['.pdf', '.txt', '.md', '.docx'],
  maxFileSizeMB = 10,
  maxFiles = 5,
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): boolean => {
    // Check file count
    if (files.length > maxFiles) {
      setValidationError(`Too many files. Maximum allowed is ${maxFiles}.`);
      return false;
    }

    // Check file sizes and types
    for (const file of files) {
      const fileExtension = `.${file.name.split('.').pop()}`;

      // Check file type
      if (!acceptedFileTypes.includes(fileExtension.toLowerCase())) {
        setValidationError(
          `Invalid file type: ${fileExtension}. Accepted types are: ${acceptedFileTypes.join(', ')}`
        );
        return false;
      }

      // Check file size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setValidationError(`File too large: ${file.name}. Maximum size is ${maxFileSizeMB}MB.`);
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      if (validateFiles(fileArray)) {
        setSelectedFiles(fileArray);
        onUpload(fileArray);
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      if (validateFiles(fileArray)) {
        setSelectedFiles(fileArray);
        onUpload(fileArray);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isUploading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleButtonClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload documents"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple
          accept={acceptedFileTypes.join(',')}
          className="hidden"
          disabled={isUploading || isProcessing}
        />

        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <p className="text-lg font-medium mb-1">
            {isUploading
              ? 'Uploading...'
              : isProcessing
                ? 'Processing...'
                : 'Drag and drop your documents'}
          </p>
          <p className="text-sm text-gray-500 mb-4">or click to select files from your device</p>
          <p className="text-xs text-gray-400">
            Accepted file types: {acceptedFileTypes.join(', ')} • Max size: {maxFileSizeMB}MB • Max
            files: {maxFiles}
          </p>
        </div>
      </div>

      {/* Error display */}
      {(error || validationError) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <p className="font-semibold">Error:</p>
          <p>{error?.message || validationError}</p>
        </div>
      )}

      {/* Progress bar */}
      {(isUploading || isProcessing) && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">
            {isUploading ? 'Uploading documents...' : 'Processing documents...'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* File list */}
      {selectedFiles.length > 0 && !isUploading && !isProcessing && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Selected documents:</p>
          <ul className="space-y-2">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-gray-400 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-medium">{file.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
