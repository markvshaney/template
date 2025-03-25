import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWindow from '../../../src/components/chat/ChatWindow';
import { ChatCompletionService, ProcessedResponse } from '../../../src/lib/ai/chat';
import { RetrievedContext } from '../../../src/lib/ai/prompt-engineering';

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

// Mock the ChatCompletionService
jest.mock('../../../src/lib/ai/chat', () => {
  const originalModule = jest.requireActual('../../../src/lib/ai/chat');
  return {
    ...originalModule,
    ChatCompletionService: jest.fn().mockImplementation(() => ({
      streamWithContext: jest.fn().mockImplementation((message, context, options) => {
        // Simulate streaming
        if (options.streamOptions?.onChunk) {
          options.streamOptions.onChunk('Hello');
          options.streamOptions.onChunk(' world');
          options.streamOptions.onChunk('!');
        }

        // Simulate completion
        if (options.streamOptions?.onComplete) {
          options.streamOptions.onComplete({
            text: 'Hello world!',
            citations: [],
            modelName: 'test-model',
            tokensUsed: 10,
          } as ProcessedResponse);
        }

        return Promise.resolve();
      }),
      completeWithContext: jest.fn().mockResolvedValue({
        text: 'Hello world!',
        citations: [],
        modelName: 'test-model',
      }),
      clearHistory: jest.fn(),
    })),
  };
});

// Mock context retrieval function
const mockRetrieveContext = jest
  .fn()
  .mockImplementation((query: string): Promise<RetrievedContext[]> => {
    return Promise.resolve([
      {
        text: `Context for: ${query}`,
        documentTitle: 'Test Document',
        score: 0.95,
      },
    ]);
  });

describe('ChatWindow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state correctly', () => {
    render(<ChatWindow />);

    expect(screen.getByText('Start a conversation by typing a message below')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
  });

  it('shows user message and assistant response when sending a message', async () => {
    render(<ChatWindow retrieveContext={mockRetrieveContext} />);

    // Get the input field and send button
    const input = screen.getByPlaceholderText('Type a message...');

    // Type a message and send it
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for the message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });

    // Check that context was retrieved
    expect(mockRetrieveContext).toHaveBeenCalledWith('Hello');
  });

  it('clears chat history when clear button is clicked', async () => {
    render(<ChatWindow />);

    // Send a message first to have some content
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for the message to appear
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    // Click the clear button
    const clearButton = screen.getByText('Clear Chat');
    fireEvent.click(clearButton);

    // Check that the chat is cleared
    await waitFor(() => {
      expect(
        screen.getByText('Start a conversation by typing a message below')
      ).toBeInTheDocument();
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    });
  });

  it('toggles context panel when context button is clicked', async () => {
    render(<ChatWindow retrieveContext={mockRetrieveContext} />);

    // Send a message to get some context
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for the response
    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });

    // Context viewer should not be visible initially
    expect(screen.queryByText('Context Sources (1)')).not.toBeInTheDocument();

    // Click the context button
    const contextButton = screen.getByText('Context (1)');
    fireEvent.click(contextButton);

    // Context viewer should now be visible
    await waitFor(() => {
      expect(screen.getByText('Context Sources (1)')).toBeInTheDocument();
    });

    // Click the close button on the context viewer
    const closeButton = screen.getByLabelText('Close context viewer');
    fireEvent.click(closeButton);

    // Context viewer should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('Context Sources (1)')).not.toBeInTheDocument();
    });
  });
});
