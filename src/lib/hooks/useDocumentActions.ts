import { useState } from 'react';
import { Document } from '@prisma/client';

type ActionType = 'delete' | 'update';
type OnSuccessCallback = (action: ActionType, document: Document) => void;

interface UseDocumentActionsProps {
  onSuccess?: OnSuccessCallback;
  onError?: (error: Error, action: ActionType, documentId: string) => void;
}

export function useDocumentActions({ onSuccess, onError }: UseDocumentActionsProps = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Add initialization logging
  console.log('useDocumentActions hook initialized');

  const deleteDocument = async (documentId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Attempting to delete document: ${documentId}`);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete document');
      }

      const deletedDocument = await response.json();
      console.log(`Document deleted successfully: ${documentId}`);

      if (onSuccess) {
        onSuccess('delete', deletedDocument);
      }

      return deletedDocument;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Error deleting document ${documentId}:`, error);

      if (onError) {
        onError(error, 'delete', documentId);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (documentId: string, data: Partial<Document>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update document');
      }

      const updatedDocument = await response.json();

      if (onSuccess) {
        onSuccess('update', updatedDocument);
      }

      return updatedDocument;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (onError) {
        onError(error, 'update', documentId);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteDocument,
    updateDocument,
    loading,
    error,
  };
}
