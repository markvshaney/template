import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">AI Memory System</h1>
        <p className="mb-4">Welcome to the AI Memory System with RAG capabilities.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Search</h2>
            <p className="mb-4">Search the web for information.</p>
            <Link href="/search" className="px-4 py-2 bg-blue-500 text-white rounded">
              Go to Search
            </Link>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Document Storage</h2>
            <p className="mb-4">Upload and manage documents for RAG.</p>
            <Link href="/documents" className="px-4 py-2 bg-blue-500 text-white rounded">
              Manage Documents
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
