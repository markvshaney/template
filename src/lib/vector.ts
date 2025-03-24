/**
 * Vector utility functions for embedding operations
 */

/**
 * Calculate the dot product of two vectors
 * @param a First vector
 * @param b Second vector
 * @returns The dot product
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Calculate the magnitude (Euclidean norm) of a vector
 * @param v Vector
 * @returns The magnitude
 */
export function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculate the cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns The cosine similarity (ranges from -1 to 1)
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct(a, b) / (magA * magB);
}

/**
 * Calculate the Euclidean distance between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns The Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Normalize a vector to unit length
 * @param v Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(v: number[]): number[] {
  const mag = magnitude(v);

  if (mag === 0) {
    return new Array(v.length).fill(0);
  }

  return v.map((val) => val / mag);
}

/**
 * Generate a random embedding vector of specified dimension
 * @param dimension Dimension of the vector
 * @returns Random vector with values between -1 and 1
 */
export function generateRandomEmbedding(dimension: number): number[] {
  return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}
