/**
 * ChatWindow Component
 * Main container for the chat interface that manages chat state
 * and coordinates between input, messages, and context display
 */

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatCompletionService,
  ChatWithContextOptions,
  ProcessedResponse,
} from '../../lib/ai/chat';
import { RetrievedContext } from '../../lib/ai/prompt-engineering';
import ChatInput, { ChatInputOptions } from './ChatInput';
import ChatMessage, { Message } from './ChatMessage';
import ContextViewer from './ContextViewer';

interface ChatWindowProps {
  chatService?: ChatCompletionService;
  initialMessages?: Message[];
  retrieveContext?: (query: string) => Promise<RetrievedContext[]>;
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatService = new ChatCompletionService(),
  initialMessages = [],
  retrieveContext,
  className = '',
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [context, setContext] = useState<RetrievedContext[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (content: string, inputOptions?: ChatInputOptions) => {
    try {
      // Don't allow empty messages or sending during loading
      if (!content.trim() || isLoading) return;

      // Clear any previous errors
      setError(null);

      // Generate a unique ID for the message
      const messageId = uuidv4();

      // Add user message to chat
      const userMessage: Message = {
        id: messageId,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, userMessage]);

      // Start loading state
      setIsLoading(true);

      // Retrieve context if function is provided and option is enabled
      let retrievedContext: RetrievedContext[] = [];
      if (retrieveContext && inputOptions?.useContext) {
        try {
          retrievedContext = await retrieveContext(content);
          setContext(retrievedContext);
        } catch (err) {
          console.error('Failed to retrieve context:', err);
          // Continue without context if retrieval fails
        }
      }

      // Prepare assistant message placeholder
      const assistantMessageId = uuidv4();
      const assistantMessagePlaceholder: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessagePlaceholder]);

      // Prepare chat options
      const chatOptions: ChatWithContextOptions = {
        temperature: inputOptions?.temperature ?? 0.7,
        max_tokens: inputOptions?.maxTokens ?? 1000,
        streamResponse: true,
        streamOptions: {
          onChunk: (chunk: string) => {
            // Update message content incrementally
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk, isLoading: false }
                  : msg
              )
            );
          },
          onComplete: (response: ProcessedResponse) => {
            // Finalize the message with citations
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: response.text,
                      citations: response.citations,
                      isLoading: false,
                    }
                  : msg
              )
            );
            setIsLoading(false);
          },
          onError: (err: Error) => {
            setError(`Error: ${err.message}`);
            // Remove the loading message
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== assistantMessageId)
            );
            setIsLoading(false);
          },
        },
      };

      // Generate response
      await chatService.streamWithContext(content, retrievedContext, chatOptions);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };

  // Handle citation click to show context
  const handleCitationClick = () => {
    // Show the context panel if it's not already visible
    if (!showContext) {
      setShowContext(true);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    setContext([]);
    chatService.clearHistory();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowContext(!showContext)}
            className={`px-3 py-1 text-sm rounded-md ${
              showContext
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
            aria-pressed={showContext}
          >
            {context.length > 0 ? `Context (${context.length})` : 'Context'}
          </button>
          <button
            onClick={handleClearChat}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            disabled={messages.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mb-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <p>Start a conversation by typing a message below</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCitationClick={handleCitationClick}
              />
            ))
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg my-2 max-w-3xl">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Context viewer (collapsible) */}
        {showContext && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <ContextViewer
              context={context}
              isExpanded={true}
              onClose={() => setShowContext(false)}
            />
          </div>
        )}
      </div>

      {/* Chat input */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatWindow;
