/**
 * ChatInput Component
 * Allows users to enter messages for the chat interface
 */

import React, { useState, useRef, useEffect } from 'react';

export interface ChatInputOptions {
  temperature?: number;
  maxTokens?: number;
  useContext?: boolean;
}

interface ChatInputProps {
  onSend: (message: string, options?: ChatInputOptions) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<ChatInputOptions>({
    temperature: 0.7,
    maxTokens: 1000,
    useContext: true,
  });
  const [showOptions, setShowOptions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set the height to scrollHeight to fit the content
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200 // Max height in pixels
      )}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message.trim(), options);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      {showOptions && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-wrap gap-4">
          <div>
            <label
              htmlFor="temperature-slider"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Temperature
            </label>
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.temperature}
              onChange={(e) =>
                setOptions({
                  ...options,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-32"
            />
            <span className="ml-2 text-sm">{options.temperature}</span>
          </div>
          <div>
            <label
              htmlFor="max-tokens-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Max Tokens
            </label>
            <input
              id="max-tokens-input"
              type="number"
              min="100"
              max="4000"
              value={options.maxTokens}
              onChange={(e) =>
                setOptions({
                  ...options,
                  maxTokens: parseInt(e.target.value),
                })
              }
              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
            />
          </div>
          <div className="flex items-end">
            <label
              htmlFor="use-context-checkbox"
              className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <input
                id="use-context-checkbox"
                type="checkbox"
                checked={options.useContext}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    useContext: e.target.checked,
                  })
                }
                className="mr-2 h-4 w-4"
              />
              Use Context
            </label>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg resize-none overflow-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            rows={1}
            aria-label="Chat message"
          />
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label={showOptions ? 'Hide options' : 'Show options'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M8 1a.75.75 0 0 1 .75.75V6h4.5V1.75a.75.75 0 0 1 1.5 0v4.25h4.5a.75.75 0 0 1 0 1.5h-4.5v4.25a.75.75 0 0 1-1.5 0V7.5h-4.5v4.25a.75.75 0 0 1-1.5 0V7.5h-4.5a.75.75 0 0 1 0-1.5h4.5V1.75A.75.75 0 0 1 8 1Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className={`p-3 rounded-lg ${
            !message.trim() || isLoading || disabled
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Sending...
            </span>
          ) : (
            <span className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </span>
          )}
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Shift+Enter</kbd> for new
        line
      </div>
    </div>
  );
};

export default ChatInput;
