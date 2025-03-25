'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  content: string;
  contentType: string;
  processingStatus: string;
  tagsString: string;
  source: string;
  updatedAt: string;
}

export default function SimpleDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userId = 'cm8nwyxk70000sgdgdws2ej0v'; // From the fix API response

  // Direct fetch function without using hooks
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Simple page: Starting document fetch');

      // Use our new guaranteed API endpoint
      const response = await fetch(`/api/docs`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      console.log('Simple page: Fetch response received', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }

      // Read response as text first for better debugging
      const text = await response.text();
      console.log('Raw API response length:', text.length);

      if (!text || text.trim() === '') {
        throw new Error('Empty response from server');
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parsing error:', e);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
      }

      console.log('Parsed data:', data);

      if (!data || !data.documents) {
        throw new Error('No documents property in response');
      }

      setDocuments(data.documents);
      setError(null);
      console.log('Simple page: Successfully loaded', data.documents.length, 'documents');
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // For debugging - create a visible element with document info
  useEffect(() => {
    console.log('Document state updated:', {
      count: documents.length,
      loading,
      error: error?.message,
    });
  }, [documents, loading, error]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Simple Document List</h1>
      <div className="mb-4">
        <Link href="/documents" className="text-blue-500 hover:underline">
          ← Back to main document page
        </Link>
      </div>

      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <div>Documents: {documents.length}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error ? error.message : 'None'}</div>
        <div>User ID: {userId}</div>
        <button
          onClick={fetchDocuments}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Documents
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          <p className="font-bold">Error:</p>
          <p>{error.message}</p>
          <button
            onClick={fetchDocuments}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try Again
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 hover:bg-gray-50">
                <h3 className="font-medium text-blue-600">{doc.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{doc.source || 'No source'}</p>
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    {doc.processingStatus}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{new Date(doc.updatedAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{doc.content}</p>
                <div className="mt-2">
                  {doc.tagsString &&
                    doc.tagsString.split(',').map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-100 px-2 py-1 text-xs rounded mr-1 mb-1"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
