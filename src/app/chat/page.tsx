'use client';

import React, { useCallback } from 'react';
import ChatWindow from '../../components/chat/ChatWindow';
import { RetrievedContext } from '../../lib/ai/prompt-engineering';

/**
 * Chat Page
 * Renders the chat interface and handles context retrieval
 */
export default function ChatPage() {
  // Function to retrieve context for a query
  const retrieveContext = useCallback(async (query: string): Promise<RetrievedContext[]> => {
    try {
      // Call the context retrieval API
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve context: ${response.statusText}`);
      }

      const data = await response.json();
      return data.context || [];
    } catch (error) {
      console.error('Error retrieving context:', error);
      // Return empty array in case of error
      return [];
    }
  }, []);

  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col">
        <ChatWindow retrieveContext={retrieveContext} className="flex-1" />
      </div>
    </main>
  );
}
