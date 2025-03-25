/**
 * Chat Completion Module
 * Provides utilities for chat completion with context
 */

import { OllamaClient } from './ollama';
import { ChatMessage } from './types';
import { RetrievedContext, PromptTemplateFactory } from './prompt-engineering';
import { StreamCallbacks } from './streaming';
import { getPreferredModelForCapability } from './models';

/**
 * Citation object extracted from response
 */
export interface Citation {
  text: string;
  sourceIndex: number;
}

/**
 * Processed response with citations
 */
export interface ProcessedResponse {
  text: string;
  citations: Citation[];
  modelName?: string;
  tokensUsed?: number;
}

/**
 * Options for chat with context
 */
export interface ChatWithContextOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  usePromptTemplate?: 'qa' | 'summarization' | 'code' | 'chat';
  streamResponse?: boolean;
  streamCallbacks?: StreamCallbacks;
  contextWindow?: number;
  streamOptions?: {
    onToken?: (token: string) => void;
    onChunk?: (chunk: string) => void;
    onComplete?: (response: ProcessedResponse) => void;
    onError?: (error: Error) => void;
    abortSignal?: AbortSignal;
  };
}

/**
 * Default options for chat completion
 */
const DEFAULT_CHAT_OPTIONS: Partial<ChatWithContextOptions> = {
  includeHistory: true,
  maxHistoryMessages: 10,
  usePromptTemplate: 'chat',
  streamResponse: false,
  contextWindow: 4000,
};

/**
 * Service for handling chat completions with context
 */
export class ChatCompletionService {
  private client: OllamaClient;
  private chatHistory: ChatMessage[] = [];
  private promptFactory: PromptTemplateFactory;

  /**
   * Create a new chat completion service
   */
  constructor(client?: OllamaClient) {
    this.client = client || new OllamaClient();
    this.promptFactory = new PromptTemplateFactory();
  }

  /**
   * Complete a chat message with context
   */
  async completeWithContext(
    message: string,
    context: RetrievedContext[] = [],
    options: Partial<ChatWithContextOptions> = {}
  ): Promise<ProcessedResponse> {
    const mergedOptions = this.mergeOptions(options);

    // Prepare messages with prompt template
    const messages = this.prepareMessages(message, context, mergedOptions);

    // Get response from model
    const response = await this.client.chatCompletion({
      messages,
      model: mergedOptions.model || getPreferredModelForCapability('chat')?.name || 'llama2',
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.max_tokens,
      options: {
        top_p: mergedOptions.top_p,
        top_k: mergedOptions.top_k,
      },
    });

    // Update chat history
    this.updateChatHistory(
      messages,
      {
        role: 'assistant',
        content: response.message.content,
      },
      mergedOptions
    );

    // Process response to extract citations
    return this.processResponse(
      response.message.content,
      response.model,
      response.usage?.total_tokens
    );
  }

  /**
   * Stream a chat completion with context
   */
  async streamWithContext(
    message: string,
    context: RetrievedContext[] = [],
    options: Partial<ChatWithContextOptions> = {}
  ): Promise<ProcessedResponse> {
    const mergedOptions = this.mergeOptions(options);

    // Check if streaming callbacks are provided
    if (
      !mergedOptions.streamOptions?.onToken &&
      !mergedOptions.streamOptions?.onChunk &&
      !mergedOptions.streamOptions?.onComplete
    ) {
      throw new Error('At least one streaming callback is required');
    }

    // Prepare messages with prompt template
    const messages = this.prepareMessages(message, context, mergedOptions);

    // Prepare response data
    let responseText = '';
    const modelName =
      mergedOptions.model || getPreferredModelForCapability('chat')?.name || 'llama2';

    // Setup streaming callbacks
    const streamingCallbacks = {
      onChunk: (chunk: string) => {
        responseText += chunk;
        if (mergedOptions.streamOptions?.onChunk) {
          mergedOptions.streamOptions.onChunk(chunk);
        }
      },
      onStart: mergedOptions.streamCallbacks?.onStart,
      onError: mergedOptions.streamOptions?.onError,
    };

    try {
      // Get response from model with streaming
      await this.client.streamChatCompletion({
        messages,
        model: modelName,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.max_tokens,
        options: {
          top_p: mergedOptions.top_p,
          top_k: mergedOptions.top_k,
        },
        onChunk: streamingCallbacks.onChunk,
        onStart: streamingCallbacks.onStart,
        onEnd: () => {
          // Update chat history when streaming is complete
          this.updateChatHistory(
            messages,
            {
              role: 'assistant',
              content: responseText,
            },
            mergedOptions
          );
        },
      });

      // Process response to extract citations
      const processedResponse = this.processResponse(responseText, modelName);

      // Call onComplete callback if provided
      if (mergedOptions.streamOptions?.onComplete) {
        mergedOptions.streamOptions.onComplete(processedResponse);
      }

      return processedResponse;
    } catch (error) {
      // Call onError callback if provided
      if (streamingCallbacks.onError) {
        streamingCallbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Prepare messages for the model
   */
  private prepareMessages(
    message: string,
    retrievedContext: RetrievedContext[],
    options: ChatWithContextOptions
  ): ChatMessage[] {
    // Get prompt template
    const template = this.promptFactory.createTemplate(options.usePromptTemplate || 'chat');

    // Create system message
    const systemMessage: ChatMessage = {
      role: 'system',
      content: template.formatSystemMessage(),
    };

    // Create context messages
    const contextMessages = template.formatContextMessages(retrievedContext);

    // Create user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: template.formatUserMessage(message),
    };

    // Combine all messages
    const allMessages = [systemMessage, ...contextMessages];

    // Add chat history if needed
    if (options.includeHistory && this.chatHistory.length > 0) {
      allMessages.push(...this.chatHistory);
    }

    // Add user message at the end
    allMessages.push(userMessage);

    return allMessages;
  }

  /**
   * Process response to extract citations
   */
  private processResponse(
    text: string,
    modelName: string = 'unknown',
    tokensUsed?: number
  ): ProcessedResponse {
    const citations: Citation[] = [];

    // Extract citations like [1], [2], etc.
    const citationRegex = /\[(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const sourceIndex = parseInt(match[1], 10);

      // Skip if not a valid number
      if (isNaN(sourceIndex)) {
        continue;
      }

      // Add citation (convert to 0-based index)
      citations.push({
        text: match[0],
        sourceIndex: sourceIndex - 1,
      });
    }

    return {
      text,
      citations,
      modelName,
      tokensUsed,
    };
  }

  /**
   * Update chat history with new messages
   */
  private updateChatHistory(
    promptMessages: ChatMessage[],
    responseMessage: ChatMessage,
    options: ChatWithContextOptions
  ): void {
    if (!options.includeHistory) {
      return;
    }

    // Get the user message (last in prompt)
    const userMessage = promptMessages[promptMessages.length - 1];

    // Add to history
    this.chatHistory.push(userMessage);
    this.chatHistory.push(responseMessage);

    // Prune history if needed
    this.pruneHistory(options.maxHistoryMessages);
  }

  /**
   * Prune history to keep only recent messages
   */
  private pruneHistory(maxMessages: number = DEFAULT_CHAT_OPTIONS.maxHistoryMessages!): void {
    if (this.chatHistory.length <= maxMessages) {
      return;
    }

    // Remove oldest messages to stay within limit
    const excess = this.chatHistory.length - maxMessages;
    this.chatHistory = this.chatHistory.slice(excess);
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatHistory = [];
  }

  /**
   * Get current chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Merge default options with provided options
   */
  private mergeOptions(options: Partial<ChatWithContextOptions>): ChatWithContextOptions {
    return {
      ...DEFAULT_CHAT_OPTIONS,
      ...options,
    } as ChatWithContextOptions;
  }
}
