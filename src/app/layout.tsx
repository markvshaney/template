import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Memory System',
  description: 'A system for RAG and web search capabilities',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="container mx-auto px-4 py-3">
              <nav className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Link href="/" className="font-bold text-xl">
                    AI Memory System
                  </Link>
                </div>
                <div className="flex space-x-4">
                  <Link
                    href="/"
                    className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Home
                  </Link>
                  <Link
                    href="/search"
                    className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Search
                  </Link>
                  <Link
                    href="/documents"
                    className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Documents
                  </Link>
                  <Link
                    href="/chat"
                    className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Chat
                  </Link>
                </div>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
