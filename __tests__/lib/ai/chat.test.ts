/**
 * Tests for chat completion module
 */

import { ChatCompletionService, ProcessedResponse, Citation } from '../../../src/lib/ai/chat';
import { OllamaClient } from '../../../src/lib/ai/ollama';
import { RetrievedContext } from '../../../src/lib/ai/prompt-engineering';
import { getPreferredModelForCapability } from '../../../src/lib/ai/models';

// Mock modules
jest.mock('../../../src/lib/ai/ollama');
jest.mock('../../../src/lib/ai/models');

describe('ChatCompletionService', () => {
  let mockOllamaClient: jest.Mocked<OllamaClient>;
  let chatService: ChatCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOllamaClient = new OllamaClient() as jest.Mocked<OllamaClient>;

    // Mock chatCompletion
    mockOllamaClient.chatCompletion = jest.fn().mockResolvedValue({
      message: {
        role: 'assistant',
        content: 'This is a response with a citation [1].',
      },
      model: 'llama2',
      took: 0.5,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Mock streamChatCompletion
    mockOllamaClient.streamChatCompletion = jest.fn().mockImplementation(async (options) => {
      if (options.onChunk) {
        options.onChunk('This is a ');
        options.onChunk('response with a ');
        options.onChunk('citation [1].');
      }
      if (options.onStart) {
        options.onStart();
      }
      if (options.onEnd) {
        options.onEnd();
      }
      return {
        message: {
          role: 'assistant',
          content: 'This is a response with a citation [1].',
        },
        model: 'llama2',
        took: 0.5,
      };
    });

    // Mock getPreferredModelForCapability
    (getPreferredModelForCapability as jest.Mock).mockReturnValue({
      name: 'llama2',
      displayName: 'Llama 2',
      capabilities: ['chat'],
    });

    chatService = new ChatCompletionService(mockOllamaClient);
  });

  describe('Constructor', () => {
    test('Should create instance with default client', () => {
      const service = new ChatCompletionService();
      expect(service).toBeDefined();
    });

    test('Should create instance with provided client', () => {
      expect(chatService).toBeDefined();
    });
  });

  describe('completeWithContext', () => {
    test('Should generate response with context', async () => {
      const prompt = 'What is the capital of France?';
      const context: RetrievedContext[] = [
        {
          text: 'Paris is the capital of France.',
          documentId: 'doc1',
          chunkId: 'chunk1',
          score: 0.95,
        },
      ];

      const response = await chatService.completeWithContext(prompt, context);

      expect(response.text).toBe('This is a response with a citation [1].');
      expect(response.citations).toHaveLength(1);
      expect(response.citations[0].sourceIndex).toBe(0);
      expect(response.modelName).toBe('llama2');
      expect(response.tokensUsed).toBe(150);

      // Check that the client was called with correct params
      expect(mockOllamaClient.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama2',
          stream: false,
        })
      );

      // Check that messages contain the context
      const callArgs = mockOllamaClient.chatCompletion.mock.calls[0][0];
      expect(callArgs.messages).toContainEqual(
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Paris is the capital of France'),
        })
      );
    });

    test('Should handle response with no citations', async () => {
      mockOllamaClient.chatCompletion.mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'This is a response with no citations.',
        },
        model: 'llama2',
        took: 0.5,
      });

      const response = await chatService.completeWithContext('Question without citations');

      expect(response.text).toBe('This is a response with no citations.');
      expect(response.citations).toHaveLength(0);
    });

    test('Should throw error on API failure', async () => {
      mockOllamaClient.chatCompletion.mockRejectedValueOnce(new Error('API error'));

      await expect(chatService.completeWithContext('Failed question')).rejects.toThrow(
        'Chat completion failed'
      );
    });
  });

  describe('streamWithContext', () => {
    test('Should stream response with context', async () => {
      const prompt = 'Tell me about Paris';
      const context: RetrievedContext[] = [
        {
          text: 'Paris is the capital of France.',
          documentId: 'doc1',
          chunkId: 'chunk1',
        },
      ];

      const onToken = jest.fn();
      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      await chatService.streamWithContext(prompt, context, {
        streamOptions: {
          onToken,
          onChunk,
          onComplete,
          onError,
        },
      });

      // Verify that streaming callbacks were called
      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          citations: expect.any(Array),
          modelName: 'llama2',
        })
      );
      expect(onError).not.toHaveBeenCalled();

      // Check that the client was called with correct params
      expect(mockOllamaClient.streamChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama2',
          stream: true,
        })
      );
    });

    test('Should throw error without callbacks', async () => {
      await expect(chatService.streamWithContext('No callbacks')).rejects.toThrow(
        'At least one streaming callback is required'
      );
    });

    test('Should handle streaming errors', async () => {
      mockOllamaClient.streamChatCompletion.mockRejectedValueOnce(new Error('Stream error'));

      const onError = jest.fn();
      await expect(
        chatService.streamWithContext('Failed stream', [], {
          streamOptions: {
            onChunk: jest.fn(),
            onError,
          },
        })
      ).rejects.toThrow('Stream error');

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Chat history management', () => {
    test('Should add messages to history', async () => {
      expect(chatService.getHistory()).toHaveLength(0);

      await chatService.completeWithContext('First question');
      expect(chatService.getHistory()).toHaveLength(2); // User + Assistant

      await chatService.completeWithContext('Second question');
      expect(chatService.getHistory()).toHaveLength(4); // Previous + User + Assistant
    });

    test('Should clear history', async () => {
      await chatService.completeWithContext('A question');
      expect(chatService.getHistory()).not.toHaveLength(0);

      chatService.clearHistory();
      expect(chatService.getHistory()).toHaveLength(0);
    });

    test('Should prune history when it gets too long', async () => {
      // Add many messages to exceed the default limit
      for (let i = 0; i < 10; i++) {
        await chatService.completeWithContext(`Question ${i}`);
      }

      // History should be limited to the default max
      const history = chatService.getHistory();
      expect(history.length).toBeLessThanOrEqual(20); // 10 exchanges * 2 messages

      // The most recent messages should be kept
      expect(history[history.length - 2].content).toBe('Question 9');
    });

    test('Should not include history when option is disabled', async () => {
      await chatService.completeWithContext('First question');
      expect(chatService.getHistory()).toHaveLength(2);

      mockOllamaClient.chatCompletion.mockClear();
      await chatService.completeWithContext('Second question', [], { includeHistory: false });

      // Check that the client was called without history messages
      const callArgs = mockOllamaClient.chatCompletion.mock.calls[0][0];
      const userMessages = callArgs.messages.filter((msg: any) => msg.role === 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].content).toMatch(/Second question/);
    });
  });

  describe('Citation extraction', () => {
    test('Should extract citations from response text', async () => {
      mockOllamaClient.chatCompletion.mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'Source [1] says X while source [2] claims Y and [3] disagrees.',
        },
        model: 'llama2',
        took: 0.5,
      });

      const context: RetrievedContext[] = [
        { text: 'Source 1 content', documentId: 'doc1' },
        { text: 'Source 2 content', documentId: 'doc2' },
        { text: 'Source 3 content', documentId: 'doc3' },
      ];

      const response = await chatService.completeWithContext(
        'Question with multiple sources',
        context
      );

      expect(response.citations).toHaveLength(3);
      expect(response.citations[0].sourceIndex).toBe(0);
      expect(response.citations[1].sourceIndex).toBe(1);
      expect(response.citations[2].sourceIndex).toBe(2);
      expect(response.citations[0].documentId).toBe('doc1');
      expect(response.citations[1].documentId).toBe('doc2');
      expect(response.citations[2].documentId).toBe('doc3');
    });

    test('Should handle invalid citation indices', async () => {
      mockOllamaClient.chatCompletion.mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'This refers to [0] and [4] which are out of bounds.',
        },
        model: 'llama2',
        took: 0.5,
      });

      const context: RetrievedContext[] = [
        { text: 'Source 1 content', documentId: 'doc1' },
        { text: 'Source 2 content', documentId: 'doc2' },
        { text: 'Source 3 content', documentId: 'doc3' },
      ];

      const response = await chatService.completeWithContext(
        'Question with invalid citations',
        context
      );

      // Should only include the valid citation
      expect(response.citations).toHaveLength(0);
    });

    test('Should handle non-numeric citation format', async () => {
      mockOllamaClient.chatCompletion.mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: 'This cites [A] and [B] in a different format.',
        },
        model: 'llama2',
        took: 0.5,
      });

      const context: RetrievedContext[] = [
        { text: 'Source A content', documentId: 'docA' },
        { text: 'Source B content', documentId: 'docB' },
      ];

      const response = await chatService.completeWithContext(
        'Question with non-numeric citations',
        context
      );

      // Should not extract these citations
      expect(response.citations).toHaveLength(0);
    });
  });
});
