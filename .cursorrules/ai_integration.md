# AI Integration Guidelines

This document outlines the standards and best practices for AI integration in this project.

## Model Handling

### Local Models with Ollama

For local model deployment, we use Ollama:

```typescript
import { OllamaClient } from 'ollama-js';

const ollama = new OllamaClient({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
});

export async function generateText(
  prompt: string,
  modelName: string = 'mistral',
  params: ModelParameters = defaultParameters
): Promise<string> {
  try {
    const response = await ollama.generate({
      model: modelName,
      prompt,
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
    });

    return response.response;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
}
```

### Model Loading and Optimization

When loading models, follow these guidelines:

1. **Quantization**: Use 8-bit quantization for memory efficiency
2. **GPU Optimization**: Detect and utilize GPU when available
3. **Sparse Activation**: Implement sparse activation for performance
4. **Caching**: Cache model weights and intermediate results

```typescript
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web';

export async function loadModel(modelConfig: ModelConfig): Promise<Model> {
  // Check for GPU availability
  const gpu = await tf.ready();
  const useGPU = modelConfig.useGPU && gpu.getBackend() === 'webgl';

  // Apply quantization if specified
  const quantizationOptions = getQuantizationOptions(modelConfig.quantization);

  // Load the model with appropriate options
  const model = await tf.loadGraphModel(modelConfig.modelPath, {
    quantizationOptions,
  });

  return {
    model,
    config: {
      ...modelConfig,
      useGPU: useGPU,
    },
    status: 'ready',
  };
}
```

## Embeddings

### Embedding Generation

For generating embeddings, use consistent methods:

```typescript
import { pipeline } from '@xenova/transformers';

let embeddingPipeline;

export async function generateEmbedding(
  text: string,
  modelName: string = 'Xenova/all-MiniLM-L6-v2'
): Promise<EmbeddingVector> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', modelName);
  }

  const result = await embeddingPipeline(text, {
    pooling: 'mean',
    normalize: true,
  });

  return {
    dimensions: result.data.length,
    values: Array.from(result.data),
  };
}
```

### Vector Storage

For vector storage, use Pinecone or Supabase:

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function storeEmbedding(
  id: string,
  content: string,
  embedding: EmbeddingVector,
  metadata: Record<string, any> = {}
): Promise<void> {
  const index = pinecone.index(process.env.PINECONE_INDEX);

  await index.upsert([
    {
      id,
      values: embedding.values,
      metadata: {
        content,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  ]);
}

export async function searchSimilar(
  embedding: EmbeddingVector,
  limit: number = 5
): Promise<Array<{ id: string; score: number; metadata: Record<string, any> }>> {
  const index = pinecone.index(process.env.PINECONE_INDEX);

  const results = await index.query({
    vector: embedding.values,
    topK: limit,
    includeMetadata: true,
  });

  return results.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));
}
```

## Memory Systems

### Neocortical System (Slow Learning)

The neocortical system is based on fine-tuned models:

```typescript
export class NeocorticalMemory {
  private model: Model;

  constructor(modelConfig: ModelConfig) {
    this.initializeModel(modelConfig);
  }

  private async initializeModel(modelConfig: ModelConfig): Promise<void> {
    this.model = await loadModel(modelConfig);
  }

  async recall(query: string): Promise<string> {
    // Use the model to generate a response based on learned patterns
    return generateText(query, this.model.config.modelName);
  }

  async learn(data: Array<{ input: string; output: string }>): Promise<void> {
    // Implement fine-tuning logic here
    // This is a simplified example
    console.log(`Learning ${data.length} examples...`);
    // In a real implementation, this would trigger a fine-tuning job
  }
}
```

### Hippocampal System (Fast Learning)

The hippocampal system uses RAG for fast learning:

```typescript
export class HippocampalMemory {
  async store(content: string, metadata: Record<string, any> = {}): Promise<string> {
    const id = generateUniqueId();
    const embedding = await generateEmbedding(content);

    await storeEmbedding(id, content, embedding, metadata);

    return id;
  }

  async recall(query: string, limit: number = 5): Promise<Array<MemoryEntry>> {
    const queryEmbedding = await generateEmbedding(query);
    const results = await searchSimilar(queryEmbedding, limit);

    return results.map((result) => ({
      id: result.id,
      content: result.metadata.content,
      embedding: {
        dimensions: queryEmbedding.dimensions,
        values: [], // We don't typically return the full vector
      },
      timestamp: new Date(result.metadata.timestamp),
      importance: result.score,
    }));
  }

  async generateWithContext(query: string, modelName: string = 'mistral'): Promise<string> {
    // Retrieve relevant memories
    const memories = await this.recall(query);

    // Format context from memories
    const context = memories.map((memory) => memory.content).join('\n\n');

    // Generate response with context
    const prompt = `Context information:
${context}

Based on the above context, please answer the following:
${query}`;

    return generateText(prompt, modelName);
  }
}
```

### Memory Integration

Integrate both memory systems:

```typescript
export class IntegratedMemory {
  private neocortical: NeocorticalMemory;
  private hippocampal: HippocampalMemory;

  constructor(modelConfig: ModelConfig) {
    this.neocortical = new NeocorticalMemory(modelConfig);
    this.hippocampal = new HippocampalMemory();
  }

  async recall(query: string): Promise<string> {
    // Get memories from hippocampal system
    const episodicMemories = await this.hippocampal.recall(query);

    if (episodicMemories.length > 0) {
      // If we have relevant episodic memories, use RAG
      return this.hippocampal.generateWithContext(query);
    } else {
      // Fall back to neocortical system
      return this.neocortical.recall(query);
    }
  }

  async learn(content: string): Promise<void> {
    // Store in hippocampal memory immediately
    await this.hippocampal.store(content);

    // Collect data for eventual neocortical learning
    // This would be part of a consolidation process
  }
}
```

## Best Practices

1. **Error Handling**: Always implement robust error handling for AI operations
2. **Fallbacks**: Provide fallback mechanisms when models or services fail
3. **Caching**: Cache results to improve performance and reduce API calls
4. **Monitoring**: Log model performance and errors for analysis
5. **Rate Limiting**: Implement rate limiting for API calls to external services
6. **Security**: Never expose API keys or model credentials in client-side code
7. **Privacy**: Be mindful of data privacy when storing user interactions

## Performance Considerations

1. **Model Size**: Use the smallest model that meets requirements
2. **Batch Processing**: Batch requests when possible
3. **Streaming**: Use streaming responses for long-form generation
4. **Quantization**: Apply quantization for memory efficiency
5. **Lazy Loading**: Load models only when needed

## Testing AI Components

1. **Unit Tests**: Test individual AI utility functions
2. **Integration Tests**: Test the integration between AI components
3. **Mock Responses**: Use mock responses for testing to avoid API calls
4. **Deterministic Testing**: Set random seeds for deterministic outputs
5. **Performance Testing**: Measure and test response times

Example test:

```typescript
import { generateEmbedding } from '../lib/ai/embeddings';

describe('Embedding Generation', () => {
  it('should generate embeddings with the correct dimensions', async () => {
    const text = 'This is a test sentence';
    const embedding = await generateEmbedding(text);

    expect(embedding).toBeDefined();
    expect(embedding.dimensions).toBe(384); // For all-MiniLM-L6-v2
    expect(embedding.values.length).toBe(embedding.dimensions);
  });

  it('should generate similar embeddings for similar texts', async () => {
    const text1 = 'The cat sat on the mat';
    const text2 = 'A cat was sitting on a mat';

    const embedding1 = await generateEmbedding(text1);
    const embedding2 = await generateEmbedding(text2);

    const similarity = calculateCosineSimilarity(embedding1.values, embedding2.values);

    expect(similarity).toBeGreaterThan(0.8); // High similarity expected
  });
});
```
