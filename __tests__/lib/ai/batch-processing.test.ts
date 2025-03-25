/**
 * Tests for batch processing module
 */

import { BatchProcessor, BatchProcessingOptions } from '../../../src/lib/ai/batch-processing';

describe('BatchProcessor', () => {
  // Simple mock processor function that returns the items multiplied by 2
  const mockProcessorFn = jest.fn(async (items: number[]) => {
    return items.map((item) => item * 2);
  });

  // Reset mock before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('Should create an instance with default options', () => {
      const processor = new BatchProcessor({
        processorFn: mockProcessorFn,
      });
      expect(processor).toBeDefined();
    });

    test('Should create an instance with custom options', () => {
      const processor = new BatchProcessor({
        processorFn: mockProcessorFn,
        batchSize: 5,
        maxConcurrent: 2,
        continueOnError: false,
      });
      expect(processor).toBeDefined();
    });
  });

  describe('processBatch', () => {
    test('Should process items in batches', async () => {
      const processor = new BatchProcessor({
        processorFn: mockProcessorFn,
        batchSize: 3,
      });

      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const results = await processor.processBatch<number, number>(items);

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
      expect(mockProcessorFn).toHaveBeenCalledTimes(3); // With batch size 3, should call the processor 3 times
    });

    test('Should handle empty input', async () => {
      const processor = new BatchProcessor({
        processorFn: mockProcessorFn,
      });

      const results = await processor.processBatch<number, number>([]);

      expect(results).toEqual([]);
      expect(mockProcessorFn).not.toHaveBeenCalled();
    });

    test('Should respect maxConcurrent option', async () => {
      // Create a processor with concurrency control
      const processor = new BatchProcessor({
        processorFn: async (items: number[]) => {
          // Simulate async processing
          await new Promise((resolve) => setTimeout(resolve, 10));
          return items.map((item) => item * 2);
        },
        batchSize: 2,
        maxConcurrent: 2,
      });

      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const results = await processor.processBatch<number, number>(items);

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
    });

    test('Should call onBatchComplete callback', async () => {
      const onBatchComplete = jest.fn();

      const processor = new BatchProcessor({
        processorFn: mockProcessorFn,
        batchSize: 2,
      });

      const items = [1, 2, 3, 4, 5, 6];
      await processor.processBatch<number, number>(items, { onBatchComplete });

      expect(onBatchComplete).toHaveBeenCalled();
    });

    test('Should handle errors when continueOnError is true', async () => {
      const errorProcessorFn = jest.fn(async (items: number[]) => {
        if (items.includes(3)) {
          throw new Error('Error processing batch');
        }
        return items.map((item) => item * 2);
      });

      const onError = jest.fn();

      const processor = new BatchProcessor({
        processorFn: errorProcessorFn,
        batchSize: 2,
        continueOnError: true,
      });

      const items = [1, 2, 3, 4, 5, 6];
      const results = await processor.processBatch<number, number>(items, { onError });

      // Should still return results for non-error batches
      expect(results.filter((r) => r !== null)).toEqual([2, 4, 10, 12]);
      expect(onError).toHaveBeenCalled();
    });

    test('Should throw error when continueOnError is false', async () => {
      const errorProcessorFn = jest.fn(async (items: number[]) => {
        if (items.includes(3)) {
          throw new Error('Error processing batch');
        }
        return items.map((item) => item * 2);
      });

      const processor = new BatchProcessor({
        processorFn: errorProcessorFn,
        batchSize: 2,
        continueOnError: false,
      });

      const items = [1, 2, 3, 4, 5, 6];

      await expect(processor.processBatch<number, number>(items)).rejects.toThrow(
        'Error processing batch'
      );
    });
  });

  describe('createAdaptiveBatchProcessor', () => {
    test('Should create a processor with adaptive batch sizing', async () => {
      // Function to get the "size" of an item (in this case, just its value)
      const lengthFn = (item: string) => item.length;

      // Create an adaptive processor
      const processor = BatchProcessor.createAdaptiveBatchProcessor<string>(
        async (items: string[]) => items.map((item) => item.toUpperCase()),
        lengthFn,
        { batchSize: 3 }
      );

      // Test with items of varying sizes
      const items = [
        'short',
        'medium length text',
        'very very very very very very very long text',
        'another short text',
        'more text here with some length',
      ];

      const results = await processor.processBatch<string, string>(items);

      expect(results).toEqual([
        'SHORT',
        'MEDIUM LENGTH TEXT',
        'VERY VERY VERY VERY VERY VERY VERY LONG TEXT',
        'ANOTHER SHORT TEXT',
        'MORE TEXT HERE WITH SOME LENGTH',
      ]);
    });
  });
});
