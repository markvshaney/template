'use client';

import React, { useState } from 'react';
import { DocumentUpload } from '@/components/rag/DocumentUpload';
import { RetrievalResults } from '@/components/rag/RetrievalResults';
import { RetrievalResult } from '@/lib/rag/retrieval';
import { VectorSearchResult } from '@/lib/rag/vector-store';
import { DocumentChunk } from '@/lib/rag/document-processing';

export default function DocumentsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create a mock retrieval result matching the required types
  const [retrievalResult, setRetrievalResult] = useState<RetrievalResult>({
    context: '',
    results: [],
  });

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Upload files to backend
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(uploadInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadProgress(100);
      setIsUploading(false);

      // Start processing
      setIsProcessing(true);

      // Simulate document processing
      setTimeout(() => {
        setIsProcessing(false);

        // Create mock retrieval result with proper typing
        const mockChunk: DocumentChunk = {
          id: 'chunk1',
          documentId: 'doc1',
          content: 'This is a sample document chunk that would be retrieved.',
          startPosition: 0,
          endPosition: 54,
          metadata: {
            source: files[0].name,
            page: 1,
            chunkIndex: 0,
            isFirst: true,
            isLast: true,
          },
        };

        const mockResults: VectorSearchResult[] = [
          {
            id: 'chunk1',
            documentId: 'doc1',
            chunk: mockChunk,
            score: 0.92,
          },
        ];

        setRetrievalResult({
          context: 'Sample document content for retrieval context.',
          results: mockResults,
          sources: [
            {
              id: 'doc1',
              title: files[0].name,
            },
          ],
        });
      }, 2000);
    } catch (error) {
      setUploadError(error instanceof Error ? error : new Error('Unknown upload error'));
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Document Management</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
          <DocumentUpload
            onUpload={handleUpload}
            isUploading={isUploading}
            isProcessing={isProcessing}
            progress={uploadProgress}
            error={uploadError}
            acceptedFileTypes={['.pdf', '.txt', '.md', '.docx']}
            maxFileSizeMB={10}
            maxFiles={5}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Document Chunks</h2>
          <RetrievalResults
            retrievalResult={retrievalResult}
            isLoading={false}
            showSources={true}
          />
        </div>
      </div>
    </div>
  );
}
