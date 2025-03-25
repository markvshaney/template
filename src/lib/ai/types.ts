/**
 * Types for AI capabilities
 * Contains type definitions for Ollama API interactions
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
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  /** Model to use for embedding generation */
  model: string;
  /** Batch size for processing multiple texts */
  batchSize?: number;
  /** Whether to normalize the embeddings */
  normalize?: boolean;
  /** Additional model parameters */
  modelParams?: ModelParameters;
  /** Whether to cache embeddings */
  cacheEnabled?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Maximum number of concurrent batches */
  maxConcurrent?: number;
  /** Model to use specifically for query embeddings */
  queryModel?: string;
  /** Model to use specifically for code embeddings */
  codeModel?: string;
}

/**
 * Model capability/task type
 */
export type ModelCapability = 'chat' | 'embedding' | 'completion' | 'rag';

/**
 * Model registry entry with detailed information
 */
export interface ModelRegistryEntry {
  /** Model name as used in Ollama */
  name: string;
  /** Model display name for UI */
  displayName: string;
  /** Model description */
  description: string;
  /** Model capabilities/supported tasks */
  capabilities: ModelCapability[];
  /** Model context window size in tokens */
  contextWindow: number;
  /** Recommended parameters for best performance */
  recommendedParams: ModelParameters;
  /** Model tags for filtering */
  tags: string[];
  /** If this is a preferred model for a specific capability */
  preferredFor?: ModelCapability[];
  /** If model requires specific hardware */
  hardwareRequirements?: {
    minGpuMemory?: number;
    minRamGb?: number;
    preferGpu?: boolean;
  };
}
