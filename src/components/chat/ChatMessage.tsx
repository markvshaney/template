/**
 * ChatMessage Component
 * Displays an individual message in the chat interface with styling based on role
 */

import React from 'react';
import { Citation } from '../../lib/ai/chat';
import { formatDistanceToNow } from 'date-fns';

// Message type definition
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  isLoading?: boolean;
}

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCitationClick }) => {
  // Determine message styling based on role
  const messageBgColor =
    message.role === 'user'
      ? 'bg-blue-50 dark:bg-blue-900/20'
      : message.role === 'system'
        ? 'bg-gray-100 dark:bg-gray-800/50'
        : 'bg-white dark:bg-gray-800';

  const messageTextColor =
    message.role === 'user'
      ? 'text-blue-800 dark:text-blue-200'
      : message.role === 'system'
        ? 'text-gray-700 dark:text-gray-300'
        : 'text-gray-900 dark:text-white';

  // Format the timestamp to relative time (e.g., "5 minutes ago")
  const formattedTime = formatDistanceToNow(message.timestamp, { addSuffix: true });

  // Render loading state
  if (message.isLoading) {
    return (
      <div className={`p-4 rounded-lg my-2 max-w-3xl ${messageBgColor}`}>
        <div className="flex items-center">
          <div className="animate-pulse flex space-x-2">
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
          <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            Generating response...
          </div>
        </div>
      </div>
    );
  }

  // Helper function to render content with citations
  const renderContentWithCitations = () => {
    if (!message.citations || message.citations.length === 0) {
      return <div className={messageTextColor}>{message.content}</div>;
    }

    // Split content by citation markers and render each part
    const parts = [];
    let lastIndex = 0;
    let match;

    // Regular expression to find citation patterns [number]
    const regex = /\[(\d+)\]/g;

    while ((match = regex.exec(message.content)) !== null) {
      const citationNumber = parseInt(match[1], 10);
      const citationIndex = citationNumber - 1;

      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className={messageTextColor}>
            {message.content.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add the citation as a button if valid
      if (citationIndex >= 0 && citationIndex < message.citations.length) {
        parts.push(
          <button
            key={`citation-${match.index}`}
            className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer"
            onClick={() => onCitationClick && onCitationClick(message.citations![citationIndex])}
            aria-label={`Citation ${citationNumber}`}
          >
            [{citationNumber}]
          </button>
        );
      } else {
        // If invalid citation index, just render the text
        parts.push(
          <span key={`invalid-citation-${match.index}`} className={messageTextColor}>
            {match[0]}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last citation
    if (lastIndex < message.content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className={messageTextColor}>
          {message.content.substring(lastIndex)}
        </span>
      );
    }

    return <div>{parts}</div>;
  };

  // Render the message
  return (
    <div className={`p-4 rounded-lg my-2 max-w-3xl ${messageBgColor}`}>
      <div className="flex items-center mb-1">
        <div className="font-semibold capitalize">{message.role}</div>
        <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">{formattedTime}</div>
      </div>
      <div className="whitespace-pre-wrap overflow-auto">{renderContentWithCitations()}</div>
      {message.citations && message.citations.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Sources: {message.citations.length} citation{message.citations.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
