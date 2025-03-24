import { useState, useCallback } from 'react';
import { Document } from '../rag/document-processing';

interface UseDocumentUploadProps {
  onSuccess?: (documents: Document[]) => void;
  onError?: (error: Error) => void;
}

interface UseDocumentUploadReturn {
  documents: Document[];
  uploading: boolean;
  progress: number;
  error: Error | null;
  uploadDocuments: (files: File[]) => Promise<void>;
  clearDocuments: () => void;
  processingDocuments: boolean;
}

export function useDocumentUpload({
  onSuccess,
  onError,
}: UseDocumentUploadProps = {}): UseDocumentUploadReturn {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingDocuments, setProcessingDocuments] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadDocuments = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        const response = await fetch('/api/rag/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setDocuments((prev) => [...prev, ...data.documents]);

        // Process the documents (chunking and generating embeddings)
        setProcessingDocuments(true);

        const processingResponse = await fetch('/api/rag/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentIds: data.documents.map((doc: Document) => doc.id),
          }),
        });

        if (!processingResponse.ok) {
          throw new Error(
            `Processing failed: ${processingResponse.status} ${processingResponse.statusText}`
          );
        }

        const processingData = await processingResponse.json();
        onSuccess?.(processingData.documents);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setUploading(false);
        setProcessingDocuments(false);
      }
    },
    [onSuccess, onError]
  );

  const clearDocuments = useCallback(() => {
    setDocuments([]);
    setError(null);
  }, []);

  return {
    documents,
    uploading,
    progress,
    error,
    uploadDocuments,
    clearDocuments,
    processingDocuments,
  };
}
