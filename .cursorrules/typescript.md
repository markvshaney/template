# TypeScript Guidelines

This document outlines the TypeScript standards and best practices for this project.

## TypeScript Configuration

The project uses a strict TypeScript configuration to ensure type safety and code quality:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Type Definitions

### Custom Type Definitions

- Place shared type definitions in `types/` directory
- Use descriptive names for interfaces and types
- Export types from barrel files (index.ts) for easier imports

Example:

```typescript
// types/ai.ts
export interface ModelConfig {
  modelName: string;
  quantization: '8bit' | '16bit' | '32bit';
  useGPU: boolean;
}

export type ModelStatus = 'loading' | 'ready' | 'error';

// types/index.ts
export * from './ai';
export * from './database';
// etc.
```

### External Type Definitions

- Install type definitions for external libraries: `npm install --save-dev @types/library-name`
- Create custom type definitions for untyped libraries in `types/custom.d.ts`

## Naming Conventions

- Use PascalCase for interfaces, types, classes, and components
- Use camelCase for variables, functions, and methods
- Use UPPER_CASE for constants
- Use descriptive names that convey purpose

## Best Practices

### Type Assertions

- Avoid using `any` type whenever possible
- Use type assertions (`as Type`) only when necessary
- Prefer type guards over type assertions

```typescript
// Bad
const user = data as any;

// Good
const user = data as User;

// Better
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data && 'name' in data;
}

if (isUser(data)) {
  // data is typed as User here
}
```

### Nullability

- Use optional chaining (`?.`) for potentially undefined properties
- Use nullish coalescing (`??`) for default values
- Be explicit about null/undefined in function parameters

```typescript
// Good
function getUserName(user?: User): string {
  return user?.name ?? 'Anonymous';
}
```

### Generics

- Use generics to create reusable components and functions
- Provide descriptive names for generic type parameters
- Use constraints when appropriate

```typescript
// Good
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### Async Code

- Always use `Promise<T>` for functions that return promises
- Use `async/await` instead of promise chains for better readability

```typescript
// Good
async function fetchUserData(userId: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    return (await response.json()) as User;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}
```

## AI-Specific Types

For AI model handling, use specific types to ensure type safety:

```typescript
// Example AI-specific types
export interface EmbeddingVector {
  dimensions: number;
  values: number[];
}

export interface ModelParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  embedding: EmbeddingVector;
  timestamp: Date;
  importance: number;
}
```

## Documentation

- Use JSDoc comments for public functions, classes, and interfaces
- Include parameter descriptions, return types, and examples
- Document complex logic with inline comments

````typescript
/**
 * Generates an embedding vector for the given text using the specified model
 *
 * @param text - The text to generate an embedding for
 * @param model - The embedding model to use (defaults to 'all-MiniLM-L6-v2')
 * @returns A promise that resolves to an embedding vector
 *
 * @example
 * ```ts
 * const embedding = await generateEmbedding('Hello world');
 * ```
 */
async function generateEmbedding(
  text: string,
  model: string = 'all-MiniLM-L6-v2'
): Promise<EmbeddingVector> {
  // Implementation
}
````
