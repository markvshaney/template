'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Document } from '@prisma/client';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { useDocumentActions } from '@/lib/hooks/useDocumentActions';

interface DocumentDetailProps {
  params: { id: string };
}

export default function DocumentDetailPage({ params }: DocumentDetailProps) {
  const router = useRouter();
  const { id } = params;

  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const {
    updateDocument,
    deleteDocument,
    loading: actionLoading,
    error: actionError,
  } = useDocumentActions({
    onSuccess: (action: 'delete' | 'update', _document: Document) => {
      if (action === 'delete') {
        router.push('/documents');
      } else if (action === 'update') {
        setEditing(false);
        fetchDocument();
      }
    },
  });

  const fetchDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}?includeChunks=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const data = await response.json();

      setDocument(data.document);
      setChunks(data.chunks || []);
      setTitle(data.document.title);
      setTags(data.document.tagsString ? data.document.tagsString.split(',') : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      await deleteDocument(id);
    }
  };

  const handleSave = async () => {
    await updateDocument(id, {
      title,
      tags,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-8 flex justify-center">
          <svg
            className="animate-spin h-8 w-8 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <p className="font-semibold">Error loading document:</p>
          <p>{error.message}</p>
          <button
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-900"
            onClick={fetchDocument}
          >
            Try again
          </button>
          <button
            className="mt-2 ml-4 text-sm font-medium text-blue-700 hover:text-blue-900"
            onClick={() => router.push('/documents')}
          >
            Back to documents
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-600">
          <p className="font-semibold">Document not found</p>
          <button
            className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            onClick={() => router.push('/documents')}
          >
            Back to documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => router.push('/documents')}
          >
            <svg
              className="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">{editing ? 'Edit Document' : 'Document Details'}</h1>
        </div>
        <div className="flex space-x-2">
          {editing ? (
            <>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {
                  setEditing(false);
                  setTitle(document.title);
                  setTags(document.tagsString ? document.tagsString.split(',') : []);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleSave}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <p className="font-semibold">Error:</p>
          <p>{actionError.message}</p>
        </div>
      )}

      {editing ? (
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6 p-6">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center h-3 w-3"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <span className="sr-only">Remove tag {tag}</span>
                    <svg
                      className="h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                id="new-tag"
                name="new-tag"
                className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-700 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleAddTag}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : (
        <DocumentViewer document={document} chunks={chunks} />
      )}
    </div>
  );
}
