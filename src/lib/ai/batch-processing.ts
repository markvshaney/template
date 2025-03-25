/**
 * Batch Processing Module
 * Efficient utilities for processing large document sets in batches
 */

/**
 * Options for batch processing
 */
export interface BatchProcessingOptions {
  /** Maximum number of items to process in a single batch */
  batchSize?: number;
  /** Maximum number of concurrent batches to process */
  maxConcurrent?: number;
  /** Function to call after a batch is processed */
  onBatchComplete?: (batchIndex: number, totalBatches: number) => void;
  /** Function to call when an error occurs */
  onError?: (error: Error, itemIndex: number, batchIndex: number) => void;
  /** Whether to continue processing after errors */
  continueOnError?: boolean;
  /** Whether to prioritize certain items (1-10, higher is higher priority) */
  priorityFn?: <T>(item: T, index: number) => number;
}

/**
 * Default options for batch processing
 */
const DEFAULT_BATCH_OPTIONS: BatchProcessingOptions = {
  batchSize: 10,
  maxConcurrent: 3,
  continueOnError: true,
};

/**
 * Batch processor for efficient handling of large datasets
 */
export class BatchProcessor<T, R> {
  private options: BatchProcessingOptions;
  private processorFn: (items: T[]) => Promise<R[]>;

  /**
   * Create a new batch processor
   * @param options Batch processing options
   * @param processorFn Function to process a batch of items
   */
  constructor(options: BatchProcessingOptions & { processorFn: (items: T[]) => Promise<R[]> }) {
    this.options = {
      ...DEFAULT_BATCH_OPTIONS,
      ...options,
    };
    this.processorFn = options.processorFn;
  }

  /**
   * Process items in batches
   * @param items Items to process
   * @param options Batch processing options (overrides instance options)
   * @returns Processed items
   */
  async processBatch(items: T[], options?: BatchProcessingOptions): Promise<R[]> {
    if (items.length === 0) {
      return [] as R[];
    }

    // Apply options
    const batchOptions = {
      ...this.options,
      ...options,
    };

    const batchSize = batchOptions.batchSize || DEFAULT_BATCH_OPTIONS.batchSize!;
    const maxConcurrent = batchOptions.maxConcurrent || DEFAULT_BATCH_OPTIONS.maxConcurrent!;

    // Create batches
    const batches: T[][] = [];

    // If prioritization is enabled, sort items first
    const itemsToProcess = [...items];
    if (batchOptions.priorityFn) {
      itemsToProcess.sort((a, b) => {
        const priorityA = batchOptions.priorityFn!(a, items.indexOf(a));
        const priorityB = batchOptions.priorityFn!(b, items.indexOf(b));
        return priorityB - priorityA; // Higher priority first
      });
    }

    // Split into batches
    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      batches.push(itemsToProcess.slice(i, i + batchSize));
    }

    // Process batches with concurrency control
    const results: R[] = [];
    const originalIndices = new Map<T, number>();
    items.forEach((item, index) => originalIndices.set(item, index));

    // Process batches in chunks of maxConcurrent
    for (let i = 0; i < batches.length; i += maxConcurrent) {
      const batchChunk = batches.slice(i, i + maxConcurrent);

      try {
        const batchPromises = batchChunk.map((batch, batchIndex) =>
          this.processBatchWithRetries(batch, i + batchIndex, batches.length, batchOptions)
        );

        const batchResults = await Promise.all(batchPromises);

        // Flatten results
        for (const batchResult of batchResults) {
          results.push(...batchResult);
        }

        // Call the onBatchComplete callback if provided
        if (batchOptions.onBatchComplete) {
          batchOptions.onBatchComplete(i + maxConcurrent, batches.length);
        }
      } catch (error) {
        if (!batchOptions.continueOnError) {
          throw error;
        }
        console.error('Error processing batch chunk:', error);
      }
    }

    // Rearrange results to match original order if prioritization was used
    if (batchOptions.priorityFn) {
      const resultMap = new Map<number, R>();
      itemsToProcess.forEach((item, processedIndex) => {
        const originalIndex = originalIndices.get(item)!;
        resultMap.set(originalIndex, results[processedIndex]);
      });

      return Array.from({ length: items.length }, (_, i) => resultMap.get(i)!);
    }

    return results;
  }

  /**
   * Process a single batch with retries
   * @param batch Batch of items to process
   * @param batchIndex Index of the batch
   * @param totalBatches Total number of batches
   * @param options Batch processing options
   * @returns Processed items
   */
  private async processBatchWithRetries(
    batch: T[],
    batchIndex: number,
    totalBatches: number,
    options: BatchProcessingOptions
  ): Promise<R[]> {
    try {
      const results = await this.processorFn(batch);

      // Call the onBatchComplete callback if provided
      if (options.onBatchComplete) {
        options.onBatchComplete(batchIndex + 1, totalBatches);
      }

      return results;
    } catch (error) {
      // Call the onError callback if provided
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)), 0, batchIndex);
      }

      if (options.continueOnError) {
        console.error(`Error processing batch ${batchIndex + 1}/${totalBatches}:`, error);
        // Return empty results for this batch
        return Array(batch.length).fill(null) as unknown as R[];
      } else {
        throw error;
      }
    }
  }

  /**
   * Create a batch processor with adaptive sizing based on content length
   * Longer content gets processed in smaller batches
   */
  static createAdaptiveBatchProcessor<T, R>(
    processorFn: (items: T[]) => Promise<R[]>,
    lengthFn: (item: T) => number,
    options?: BatchProcessingOptions
  ): BatchProcessor<T, R> {
    const processor = new BatchProcessor<T, R>({
      ...options,
      processorFn,
      batchSize: options?.batchSize || DEFAULT_BATCH_OPTIONS.batchSize!,
    });

    // Override the process batch method
    processor.processBatch = async (
      items: T[],
      batchOptions?: BatchProcessingOptions
    ): Promise<R[]> => {
      if (items.length === 0) {
        return [] as R[];
      }

      // Create adaptively sized batches based on content length
      const adaptiveBatches: T[][] = [];
      let currentBatch: T[] = [];
      let currentBatchSize = 0;
      const targetBatchSize =
        (batchOptions?.batchSize || options?.batchSize || DEFAULT_BATCH_OPTIONS.batchSize!) * 100; // Arbitrary "token" size

      for (const item of items) {
        const itemSize = lengthFn(item);

        // If adding this item would make the batch too large, start a new batch
        if (currentBatchSize + itemSize > targetBatchSize && currentBatch.length > 0) {
          adaptiveBatches.push(currentBatch);
          currentBatch = [item];
          currentBatchSize = itemSize;
        } else {
          currentBatch.push(item);
          currentBatchSize += itemSize;
        }
      }

      // Add the last batch if it's not empty
      if (currentBatch.length > 0) {
        adaptiveBatches.push(currentBatch);
      }

      // Process the adaptive batches
      const results: R[] = [];
      for (let i = 0; i < adaptiveBatches.length; i++) {
        const batchResult = await processorFn(adaptiveBatches[i]);
        results.push(...batchResult);

        if (batchOptions?.onBatchComplete) {
          batchOptions.onBatchComplete(i + 1, adaptiveBatches.length);
        }
      }

      return results;
    };

    return processor;
  }
}
