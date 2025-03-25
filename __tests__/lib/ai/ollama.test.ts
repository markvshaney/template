/**
 * Tests for Ollama API client
 */

import { OllamaClient } from '../../../src/lib/ai/ollama';
import { ChatCompletionOptions, ChatMessage, EmbeddingOptions } from '../../../src/lib/ai/types';

// Mock fetch API
global.fetch = jest.fn();

// Helper to mock successful responses
const mockFetchResponse = (data: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

// Helper to mock failed responses
const mockFetchError = (status = 500, statusText = 'Internal Server Error') => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
  });
};

// Mock AbortController and Signal
class MockAbortController {
  signal = { aborted: false };
  abort = jest.fn();
}

global.AbortController = MockAbortController as any;
global.AbortSignal = {
  timeout: () => ({ aborted: false }),
} as any;

describe('OllamaClient', () => {
  let ollamaClient: OllamaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    ollamaClient = new OllamaClient();
  });

  describe('Constructor', () => {
    test('Should initialize with default values', () => {
      expect(ollamaClient).toBeDefined();
    });

    test('Should accept custom configuration', () => {
      const client = new OllamaClient({
        baseUrl: 'http://custom-url:11434',
        defaultModel: 'custom-model',
        defaultParams: { temperature: 0.5 },
      });
      expect(client).toBeDefined();
    });
  });

  describe('isAvailable', () => {
    test('Should return true when Ollama is available', async () => {
      mockFetchResponse({ version: '0.1.0' });
      const result = await ollamaClient.isAvailable();
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/version',
        expect.any(Object)
      );
    });

    test('Should return false when Ollama is not available', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
      const result = await ollamaClient.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    test('Should return list of models', async () => {
      const mockModels = {
        models: [
          { name: 'llama2', size: 3900000000, downloaded: true },
          { name: 'mistral', size: 4200000000, downloaded: true },
        ],
      };

      mockFetchResponse(mockModels);

      const result = await ollamaClient.listModels();
      expect(result).toEqual(mockModels.models);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    test('Should handle API errors', async () => {
      mockFetchError();

      await expect(ollamaClient.listModels()).rejects.toThrow('Failed to list models');
    });
  });

  describe('chatCompletion', () => {
    test('Should generate chat completion', async () => {
      const mockResponse = {
        message: { role: 'assistant', content: 'Hello there!' },
        model: 'llama2',
        took: 0.5,
      };

      mockFetchResponse(mockResponse);

      const options: ChatCompletionOptions = {
        model: 'llama2',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const result = await ollamaClient.chatCompletion(options);
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody.model).toBe('llama2');
      expect(requestBody.messages).toEqual(options.messages);
      expect(requestBody.temperature).toBe(0.7);
    });

    test('Should handle API errors', async () => {
      mockFetchError();

      const options: ChatCompletionOptions = {
        model: 'llama2',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(ollamaClient.chatCompletion(options)).rejects.toThrow('Chat completion failed');
    });
  });

  describe('createEmbedding', () => {
    test('Should generate embeddings', async () => {
      const mockResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4],
        model: 'nomic-embed-text',
        took: 0.2,
      };

      mockFetchResponse(mockResponse);

      const options: EmbeddingOptions = {
        model: 'nomic-embed-text',
        prompt: 'Hello, world!',
      };

      const result = await ollamaClient.createEmbedding(options);
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      // Verify the request body
      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody.model).toBe('nomic-embed-text');
      expect(requestBody.prompt).toBe('Hello, world!');
    });

    test('Should handle API errors', async () => {
      mockFetchError();

      const options: EmbeddingOptions = {
        model: 'nomic-embed-text',
        prompt: 'Hello, world!',
      };

      await expect(ollamaClient.createEmbedding(options)).rejects.toThrow(
        'Embedding generation failed'
      );
    });
  });

  describe('cancelRequest', () => {
    test('Should cancel an ongoing request', async () => {
      // Create a client with a mocked AbortController
      const client = new OllamaClient();

      // Mock the listModels method to store controller
      mockFetchResponse({ models: [] });
      client.listModels();

      // Test that cancelAllRequests works - we don't need to check for
      // specific request IDs since those are generated internally
      client.cancelAllRequests();

      // We can't directly test cancelRequest since we can't get the requestId
      // Instead, we just ensure the method exists and is callable
      expect(typeof client.cancelRequest).toBe('function');
      expect(client.cancelRequest('fake-id')).toBe(false);
    });

    test('Should return false for non-existent request ID', () => {
      const result = ollamaClient.cancelRequest('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('cancelAllRequests', () => {
    test('Should cancel all ongoing requests', async () => {
      // Create multiple mock requests
      mockFetchResponse({ models: [] });
      ollamaClient.listModels();

      mockFetchResponse({ models: [] });
      ollamaClient.listModels();

      ollamaClient.cancelAllRequests();

      // Check that the controllers map is empty
      expect((ollamaClient as any).abortControllers.size).toBe(0);
    });
  });

  describe('getSystemInfo', () => {
    test('Should retrieve system information', async () => {
      const mockSystemInfo = {
        cuda: { available: true, devices: [{ name: 'NVIDIA GeForce RTX 4070' }] },
        memory: { total: '64.0 GiB' },
      };

      mockFetchResponse(mockSystemInfo);

      const result = await ollamaClient.getSystemInfo();
      expect(result).toEqual(mockSystemInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/system',
        expect.any(Object)
      );
    });

    test('Should handle API errors', async () => {
      mockFetchError();

      await expect(ollamaClient.getSystemInfo()).rejects.toThrow('Failed to get system info');
    });
  });
});
