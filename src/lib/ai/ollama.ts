/**
 * Ollama API Client
 * Interface for communicating with local Ollama models
 */

import {
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatMessage,
  EmbeddingOptions,
  EmbeddingResponse,
  ModelParameters,
  OllamaConfig,
  OllamaModel,
} from './types';
import { getMergedModelParams } from './models';

// Maximum retry attempts for API calls
const MAX_RETRIES = 3;

// Delay between retries in ms (increases with each retry)
const RETRY_DELAY_MS = 1000;

/**
 * Ollama API Client
 * Interface for communicating with local Ollama models
 */

/**
 * Message in a chat conversation
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant';
  /** Content of the message */
  content: string;
}

/**
 * Model-specific parameter types
 */
export interface ModelParameters {
  /** Number of tokens to keep from prompt */
  num_ctx?: number;
  /** Number of keep-alive seconds */
  num_keep?: number;
  /** Seed for random operations */
  seed?: number;
  /** Number of threads to use */
  num_thread?: number;
  /** Model file to use */
  f16_kv?: boolean;
  /** Use mmap */
  use_mmap?: boolean;
  /** Use mlock */
  use_mlock?: boolean;
  /** Number of layers to process in parallel */
  num_batch?: number;
  /** Number of GQA groups */
  num_gqa?: number;
  /** Enable gpu */
  main_gpu?: number;
  /** Tensor split */
  tensor_split?: number[];
  /** Low VRAM mode */
  low_vram?: boolean;
  /** Extra context tokens */
  rope_frequency_base?: number;
  /** Rope scaling */
  rope_frequency_scale?: number;
  /** System prompt */
  system?: string;
  /** Other custom parameters */
  [key: string]: unknown;
}

/**
 * Options for chat completion requests
 */
export interface ChatCompletionOptions {
  /** Model to use */
  model: string;
  /** Messages in the conversation */
  messages: ChatMessage[];
  /** Temperature (0-1, higher values make output more random) */
  temperature?: number;
  /** Top-p sampling (0-1, lower values make output more focused) */
  top_p?: number;
  /** Maximum number of tokens to generate */
  max_tokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Additional model-specific parameters */
  options?: ModelParameters;
}

/**
 * Options for embedding requests
 */
export interface EmbeddingOptions {
  /** Model to use */
  model: string;
  /** Text to embed */
  prompt: string;
  /** Additional model-specific parameters */
  options?: ModelParameters;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  /** Generated message */
  message: ChatMessage;
  /** Model used */
  model: string;
  /** Time taken in seconds */
  took: number;
  /** Usage statistics */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  /** Embedding vector */
  embedding: number[];
  /** Model used */
  model: string;
  /** Time taken in seconds */
  took: number;
}

/**
 * Available models in Ollama
 */
export interface OllamaModel {
  /** Model name */
  name: string;
  /** Model size in bytes */
  size: number;
  /** Whether the model is downloaded */
  downloaded: boolean;
  /** Model family/category */
  family?: string;
  /** Model parameter count in billions */
  parameters?: number;
  /** Model quantization level */
  quantization?: string;
}

/**
 * Ollama client configuration
 */
export interface OllamaConfig {
  /** Ollama API base URL */
  baseUrl?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Default parameters */
  defaultParams?: ModelParameters;
}

/**
 * Client for Ollama API
 */
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private defaultParams: ModelParameters;
  private abortControllers: Map<string, AbortController>;

  /**
   * Create a new Ollama client
   */
  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
    this.defaultParams = config.defaultParams || {};
    this.abortControllers = new Map();
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Check if Ollama is available
   * @returns True if Ollama server is responding
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Error checking Ollama availability:', error);
      return false;
    }
  }

  /**
   * List available models with retries
   * @returns Array of available models
   */
  async listModels(retry = 0): Promise<OllamaModel[]> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      // Clean up abort controller
      this.abortControllers.delete(requestId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      // Clean up abort controller
      this.abortControllers.delete(requestId);

      // If we haven't exceeded max retries and it's a network error, retry
      if (
        retry < MAX_RETRIES &&
        (error instanceof TypeError ||
          (error instanceof Error && error.message.includes('network')))
      ) {
        console.warn(`Retry ${retry + 1}/${MAX_RETRIES} for listModels`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retry + 1)));
        return this.listModels(retry + 1);
      }

      console.error('Error listing models:', error);
      throw new Error(
        `Failed to list models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate chat completion with retries
   * @param options Chat completion options
   * @returns Chat completion response
   */
  async chatCompletion(options: ChatCompletionOptions, retry = 0): Promise<ChatCompletionResponse> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    const model = options.model || this.defaultModel;
    const mergedParams = getMergedModelParams(model, options.options);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens,
          stream: false,
          options: mergedParams,
        }),
        signal: controller.signal,
      });

      // Clean up abort controller
      this.abortControllers.delete(requestId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Clean up abort controller
      this.abortControllers.delete(requestId);

      // If we haven't exceeded max retries and it's a network error, retry
      if (
        retry < MAX_RETRIES &&
        (error instanceof TypeError ||
          (error instanceof Error && error.message.includes('network')))
      ) {
        console.warn(`Retry ${retry + 1}/${MAX_RETRIES} for chatCompletion`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retry + 1)));
        return this.chatCompletion(options, retry + 1);
      }

      console.error('Error in chat completion:', error);
      throw new Error(
        `Chat completion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embeddings for a text with retries
   * @param options Embedding options
   * @returns Embedding response
   */
  async createEmbedding(options: EmbeddingOptions, retry = 0): Promise<EmbeddingResponse> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    const model = options.model || this.defaultModel;
    const mergedParams = getMergedModelParams(model, options.options);

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: options.prompt,
          options: mergedParams,
        }),
        signal: controller.signal,
      });

      // Clean up abort controller
      this.abortControllers.delete(requestId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // Clean up abort controller
      this.abortControllers.delete(requestId);

      // If we haven't exceeded max retries and it's a network error, retry
      if (
        retry < MAX_RETRIES &&
        (error instanceof TypeError ||
          (error instanceof Error && error.message.includes('network')))
      ) {
        console.warn(`Retry ${retry + 1}/${MAX_RETRIES} for createEmbedding`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retry + 1)));
        return this.createEmbedding(options, retry + 1);
      }

      console.error('Error in embedding generation:', error);
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate completion with streaming
   * @param options Chat completion options with onChunk callback
   * @returns Chat completion response
   */
  async streamChatCompletion(
    options: ChatCompletionOptions & {
      onChunk: (chunk: string) => void;
      onStart?: () => void;
      onEnd?: () => void;
    },
    retry = 0
  ): Promise<ChatCompletionResponse> {
    const { onChunk, onStart, onEnd, ...requestOptions } = options;
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    const modelName = requestOptions.model || this.defaultModel;
    const mergedParams = getMergedModelParams(modelName, requestOptions.options);

    try {
      if (onStart) {
        onStart();
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: requestOptions.messages,
          temperature: requestOptions.temperature,
          top_p: requestOptions.top_p,
          max_tokens: requestOptions.max_tokens,
          stream: true,
          options: mergedParams,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Clean up abort controller
        this.abortControllers.delete(requestId);
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      // Process stream
      const reader = response.body?.getReader();
      let content = '';
      let responseModel = '';
      let took = 0;

      if (!reader) {
        // Clean up abort controller
        this.abortControllers.delete(requestId);
        throw new Error('Failed to get response reader');
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          const data = JSON.parse(line);

          if (data.message?.content) {
            content += data.message.content;
            onChunk(data.message.content);
          }

          // Keep track of model and time
          if (data.model) {
            responseModel = data.model;
          }

          if (data.took) {
            took = data.took;
          }

          // If done is true, we've reached the end
          if (data.done) {
            break;
          }
        }
      }

      // Clean up abort controller
      this.abortControllers.delete(requestId);

      if (onEnd) {
        onEnd();
      }

      // Return a response in the same format as non-streaming
      return {
        message: {
          role: 'assistant',
          content,
        },
        model: responseModel || modelName,
        took,
      };
    } catch (error) {
      // Clean up abort controller
      this.abortControllers.delete(requestId);

      if (onEnd) {
        onEnd();
      }

      // If we haven't exceeded max retries and it's a network error, retry
      if (
        retry < MAX_RETRIES &&
        (error instanceof TypeError ||
          (error instanceof Error && error.message.includes('network')))
      ) {
        console.warn(`Retry ${retry + 1}/${MAX_RETRIES} for streamChatCompletion`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retry + 1)));
        return this.streamChatCompletion(options, retry + 1);
      }

      console.error('Error in streaming chat completion:', error);
      throw new Error(
        `Streaming chat completion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel an ongoing request
   * @param requestId ID of the request to cancel
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAllRequests(): void {
    // Use Array.from to convert the iterator to an array
    const controllers = Array.from(this.abortControllers.values());
    for (const controller of controllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Get system information from Ollama
   */
  async getSystemInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting system info:', error);
      throw new Error(
        `Failed to get system info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
