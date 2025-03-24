import React from 'react';
import Link from 'next/link';

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back to Home
              </span>
            </Link>
            <h1 className="text-xl font-semibold ml-4">Document Management</h1>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
