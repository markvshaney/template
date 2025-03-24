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
  options?: Record<string, any>;
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
  options?: Record<string, any>;
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
  defaultParams?: Record<string, any>;
}

/**
 * Client for Ollama API
 */
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private defaultParams: Record<string, any>;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
    this.defaultParams = config.defaultParams || {};
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch (error) {
      console.error('Error checking Ollama availability:', error);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      throw new Error(
        `Failed to list models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const model = options.model || this.defaultModel;

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
          options: {
            ...this.defaultParams,
            ...options.options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in chat completion:', error);
      throw new Error(
        `Chat completion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embeddings for a text
   */
  async createEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const model = options.model || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: options.prompt,
          options: {
            ...this.defaultParams,
            ...options.options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in embedding generation:', error);
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate completion with streaming
   */
  async streamChatCompletion(
    options: ChatCompletionOptions & { onChunk: (chunk: string) => void }
  ): Promise<ChatCompletionResponse> {
    const { onChunk, ...requestOptions } = options;
    const modelName = requestOptions.model || this.defaultModel;

    try {
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
          options: {
            ...this.defaultParams,
            ...requestOptions.options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      // Process stream
      const reader = response.body?.getReader();
      let content = '';
      let responseModel = '';
      let took = 0;

      if (!reader) {
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
      console.error('Error in streaming chat completion:', error);
      throw new Error(
        `Streaming chat completion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
