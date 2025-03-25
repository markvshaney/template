/**
 * ContextViewer Component
 * Displays retrieved context and sources used in AI responses
 */

import React, { useState } from 'react';
import { RetrievedContext } from '../../lib/ai/prompt-engineering';

interface ContextViewerProps {
  context: RetrievedContext[];
  isExpanded?: boolean;
  onClose?: () => void;
}

const ContextViewer: React.FC<ContextViewerProps> = ({ context, isExpanded = false, onClose }) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);

  // If no context, render nothing
  if (!context || context.length === 0) {
    return null;
  }

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleSourceClick = (index: number) => {
    setSelectedSource(selectedSource === index ? null : index);
  };

  // Render the context source preview
  const renderSourcePreview = () => {
    if (selectedSource === null || selectedSource >= context.length) {
      return null;
    }

    const source = context[selectedSource];

    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {source.documentTitle || 'Untitled Source'}
          </h3>
          <button
            onClick={() => setSelectedSource(null)}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close preview"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-64">
          {source.text}
        </div>
        {source.metadata && Object.keys(source.metadata).length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <h4 className="font-medium mb-1">Metadata</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(source.metadata).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="text-gray-600 dark:text-gray-400">{key}:</dt>
                  <dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <button
        className="w-full p-4 flex justify-between items-center text-left cursor-pointer"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="context-content"
      >
        <h2 className="font-medium text-gray-900 dark:text-white">
          Context Sources ({context.length})
        </h2>
        <div className="flex">
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 ml-2"
              aria-label="Close context viewer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 transform transition-transform text-gray-400"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div id="context-content" className="px-4 pb-4">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {context.map((source, index) => (
              <li key={index}>
                <button
                  className="w-full py-2 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition"
                  onClick={() => handleSourceClick(index)}
                  aria-pressed={selectedSource === index}
                  aria-label={`View source ${index + 1}: ${source.documentTitle || 'Untitled Source'}`}
                >
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium mr-2">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {source.documentTitle || 'Untitled Source'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {source.metadata?.type || 'Document'} • Score:{' '}
                        {source.score?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    {selectedSource === index && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {renderSourcePreview()}
        </div>
      )}
    </aside>
  );
};

export default ContextViewer;
