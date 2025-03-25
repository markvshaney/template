/**
 * Streaming Module
 * Provides utilities for handling streaming AI responses
 */

/**
 * Callbacks for streaming process
 */
export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onCitation?: (citation: { text: string; sourceIndex: number }) => void;
}

/**
 * Stream processing options
 */
export interface StreamProcessingOptions {
  abortSignal?: AbortSignal;
  timeoutMs?: number;
  maxTokens?: number;
  bufferSize?: number;
  trimIncompleteTokens?: boolean;
}

/**
 * Default stream processing options
 */
const DEFAULT_STREAM_OPTIONS: StreamProcessingOptions = {
  timeoutMs: 60000, // 60 seconds
  bufferSize: 3,
  trimIncompleteTokens: true,
};

/**
 * Processor for streaming AI responses
 * Handles token-by-token processing with callbacks
 */
export class StreamProcessor {
  private options: StreamProcessingOptions;
  private abortController: AbortController;
  private buffer: string[] = [];
  private fullText: string = '';
  private isProcessing: boolean = false;

  /**
   * Create a new stream processor
   */
  constructor(options: StreamProcessingOptions = {}) {
    this.options = {
      ...DEFAULT_STREAM_OPTIONS,
      ...options,
    };
    this.abortController = new AbortController();
  }

  /**
   * Process a readable stream with token callbacks
   */
  async process(stream: ReadableStream, callbacks: StreamCallbacks = {}): Promise<string> {
    if (this.isProcessing) {
      throw new Error('StreamProcessor is already processing a stream');
    }

    this.isProcessing = true;
    this.buffer = [];
    this.fullText = '';

    // Merge abort signals if both exist
    const signal = this.getMergedAbortSignal();

    try {
      if (callbacks.onStart) {
        callbacks.onStart();
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Set up timeout if specified
      const timeoutId = this.setupTimeout(signal);

      while (true) {
        // Check if processing should be aborted
        if (signal.aborted) {
          throw new Error('Stream processing aborted');
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Process the decoded chunk
        this.processChunk(chunk, callbacks);
      }

      // Process any remaining buffer content
      this.flushBuffer();

      // Clear the timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (callbacks.onComplete) {
        callbacks.onComplete(this.fullText);
      }

      return this.fullText;
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Abort the current stream processing
   */
  abort(): void {
    this.abortController.abort();
  }

  /**
   * Process a chunk of text from the stream
   */
  private processChunk(chunk: string, callbacks: StreamCallbacks): void {
    if (callbacks.onChunk) {
      callbacks.onChunk(chunk);
    }

    // Split chunk into tokens (we'll use words as a simple approximation)
    // In a real implementation, this would depend on the tokenization scheme of the model
    const tokens = chunk.split(/(\s+)/).filter((token) => token.length > 0);

    // Process each token
    for (const token of tokens) {
      this.processToken(token, callbacks);

      // Check if we've reached maximum tokens
      if (this.options.maxTokens && this.fullText.length >= this.options.maxTokens) {
        this.flushBuffer();
        break;
      }
    }
  }

  /**
   * Process a single token
   */
  private processToken(token: string, callbacks: StreamCallbacks): void {
    this.buffer.push(token);
    this.fullText += token;

    if (callbacks.onToken) {
      callbacks.onToken(token);
    }

    // Check if this token contains a citation
    this.checkForCitation(token, callbacks);

    // Flush buffer if it reaches the buffer size
    if (this.buffer.length >= (this.options.bufferSize || DEFAULT_STREAM_OPTIONS.bufferSize!)) {
      this.flushBuffer();
    }
  }

  /**
   * Check if a token contains a citation and process it
   */
  private checkForCitation(token: string, callbacks: StreamCallbacks): void {
    if (!callbacks.onCitation) {
      return;
    }

    // Simple citation detection - look for [X] patterns
    const citationMatch = token.match(/\[(\d+)\]/);
    if (citationMatch) {
      const sourceIndex = parseInt(citationMatch[1], 10);
      callbacks.onCitation({
        text: token,
        sourceIndex: sourceIndex - 1, // Convert to 0-based index
      });
    }
  }

  /**
   * Flush the current buffer
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0) {
      return;
    }

    this.buffer = [];
  }

  /**
   * Set up a timeout for stream processing
   */
  private setupTimeout(signal: AbortSignal): NodeJS.Timeout | null {
    const timeoutMs = this.options.timeoutMs || DEFAULT_STREAM_OPTIONS.timeoutMs;

    if (!timeoutMs) {
      return null;
    }

    return setTimeout(() => {
      if (!signal.aborted) {
        this.abortController.abort();
      }
    }, timeoutMs);
  }

  /**
   * Merge the processor's abort signal with the options signal
   */
  private getMergedAbortSignal(): AbortSignal {
    if (!this.options.abortSignal) {
      return this.abortController.signal;
    }

    // If the options signal is already aborted, use it directly
    if (this.options.abortSignal.aborted) {
      return this.options.abortSignal;
    }

    // Otherwise create a new controller to merge the signals
    const controller = new AbortController();

    // Abort if either signal aborts
    this.options.abortSignal.addEventListener('abort', () => controller.abort());
    this.abortController.signal.addEventListener('abort', () => controller.abort());

    return controller.signal;
  }
}

/**
 * Process a stream with simple callback functions
 */
export async function processStream(
  stream: ReadableStream,
  callbacks: StreamCallbacks = {},
  options: StreamProcessingOptions = {}
): Promise<string> {
  const processor = new StreamProcessor(options);
  return processor.process(stream, callbacks);
}

/**
 * Create a transform stream for processing AI responses
 */
export function createTokenProcessor(
  callbacks: StreamCallbacks = {},
  options: StreamProcessingOptions = {}
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  return new TransformStream({
    transform(chunk, controller) {
      // Decode the chunk
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;
      fullText += text;

      // Process tokens
      const tokens = buffer.split(/(\s+)/).filter((token) => token.length > 0);

      // Keep the last token in the buffer in case it's incomplete
      buffer = options.trimIncompleteTokens ? '' : tokens.pop() || '';

      // Process complete tokens
      for (const token of tokens) {
        if (callbacks.onToken) {
          callbacks.onToken(token);
        }
      }

      // Pass the chunk through
      controller.enqueue(chunk);
    },
    flush() {
      // Process any remaining buffer content
      if (buffer && callbacks.onToken) {
        callbacks.onToken(buffer);
      }

      if (callbacks.onComplete) {
        callbacks.onComplete(fullText);
      }
    },
  });
}
