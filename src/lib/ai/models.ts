/**
 * Model Configuration and Selection
 * Handles model registry, selection, and configuration
 */

import { ModelCapability, ModelParameters, ModelRegistryEntry } from './types';

/**
 * Default model parameters for general use
 */
export const DEFAULT_MODEL_PARAMS: ModelParameters = {
  num_ctx: 4096,
  num_batch: 512,
  temperature: 0.7,
  top_p: 0.9,
};

/**
 * Registry of available models with their capabilities and recommended parameters
 */
export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    name: 'llama2',
    displayName: 'Llama 2',
    description: "Meta's Llama 2 model, general purpose LLM with 7B parameters",
    capabilities: ['chat', 'completion', 'rag'],
    contextWindow: 4096,
    recommendedParams: {
      ...DEFAULT_MODEL_PARAMS,
      temperature: 0.7,
    },
    tags: ['llama', 'general', '7b'],
    preferredFor: ['rag'],
  },
  {
    name: 'llama2:13b',
    displayName: 'Llama 2 13B',
    description: "Meta's Llama 2 model with 13B parameters for enhanced reasoning",
    capabilities: ['chat', 'completion', 'rag'],
    contextWindow: 4096,
    recommendedParams: {
      ...DEFAULT_MODEL_PARAMS,
      temperature: 0.7,
    },
    tags: ['llama', 'general', '13b'],
    preferredFor: ['chat'],
    hardwareRequirements: {
      minGpuMemory: 16,
      preferGpu: true,
    },
  },
  {
    name: 'mistral',
    displayName: 'Mistral 7B',
    description: "Mistral AI's 7B parameter model with strong performance",
    capabilities: ['chat', 'completion', 'rag'],
    contextWindow: 8192,
    recommendedParams: {
      ...DEFAULT_MODEL_PARAMS,
      num_ctx: 8192,
      temperature: 0.7,
    },
    tags: ['mistral', 'general', '7b'],
    preferredFor: ['completion'],
  },
  {
    name: 'codellama',
    displayName: 'CodeLlama',
    description: 'Specialized model for code generation and understanding',
    capabilities: ['chat', 'completion'],
    contextWindow: 16384,
    recommendedParams: {
      ...DEFAULT_MODEL_PARAMS,
      num_ctx: 16384,
      temperature: 0.5,
    },
    tags: ['code', 'programming', '7b'],
    preferredFor: ['completion'],
  },
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    description: 'Specialized model for text embeddings',
    capabilities: ['embedding'],
    contextWindow: 8192,
    recommendedParams: {
      ...DEFAULT_MODEL_PARAMS,
      num_ctx: 8192,
    },
    tags: ['embedding', 'vectorization'],
    preferredFor: ['embedding'],
  },
];

/**
 * Get a model by name
 */
export function getModelByName(name: string): ModelRegistryEntry | undefined {
  return MODEL_REGISTRY.find((model) => model.name === name);
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability: ModelCapability): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((model) => model.capabilities.includes(capability));
}

/**
 * Get preferred model for a capability
 */
export function getPreferredModelForCapability(
  capability: ModelCapability
): ModelRegistryEntry | undefined {
  // First check for models that specifically prefer this capability
  const preferredModels = MODEL_REGISTRY.filter((model) =>
    model.preferredFor?.includes(capability)
  );

  if (preferredModels.length > 0) {
    return preferredModels[0];
  }

  // If no preferred model found, return any model with this capability
  const capableModels = getModelsByCapability(capability);
  return capableModels.length > 0 ? capableModels[0] : undefined;
}

/**
 * Get recommended parameters for a model
 */
export function getRecommendedParams(modelName: string): ModelParameters {
  const model = getModelByName(modelName);
  return model?.recommendedParams || DEFAULT_MODEL_PARAMS;
}

/**
 * Get model specific parameters by merging default, model recommended, and user params
 */
export function getMergedModelParams(
  modelName: string,
  userParams: ModelParameters = {}
): ModelParameters {
  const modelParams = getRecommendedParams(modelName);

  return {
    ...DEFAULT_MODEL_PARAMS,
    ...modelParams,
    ...userParams,
  };
}

/**
 * Check if a model is compatible with specific hardware constraints
 */
export function isModelCompatibleWithHardware(
  modelName: string,
  availableGpuMemory?: number,
  availableRamGb?: number
): boolean {
  const model = getModelByName(modelName);

  if (!model || !model.hardwareRequirements) {
    return true; // If no requirements specified, assume compatible
  }

  const { minGpuMemory, minRamGb, preferGpu } = model.hardwareRequirements;

  if (minGpuMemory && availableGpuMemory !== undefined) {
    if (availableGpuMemory < minGpuMemory) {
      return false;
    }
  } else if (preferGpu && availableGpuMemory === undefined) {
    return false; // Model prefers GPU but none available
  }

  if (minRamGb && availableRamGb !== undefined) {
    if (availableRamGb < minRamGb) {
      return false;
    }
  }

  return true;
}
