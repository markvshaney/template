# Testing Guidelines

This document outlines the testing standards and best practices for this project.

## Testing Architecture

The project uses a comprehensive testing approach with multiple layers:

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test complete user flows
4. **Visual Regression Tests**: Test UI appearance and changes

## Test Directory Structure

```
project/
├── __tests__/                  # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── e2e/                    # End-to-end tests
│   ├── visual/                 # Visual regression tests
│   ├── test-utils/             # Test utilities
│   │   ├── render-utils.tsx    # Custom render functions
│   │   ├── test-data.ts        # Test data generators
│   │   ├── server-handlers.ts  # MSW request handlers
│   │   └── msw-server.ts       # MSW server setup
│   └── README.md               # Testing documentation
├── cypress/                    # Cypress tests
│   ├── e2e/                    # Cypress E2E tests
│   ├── fixtures/               # Test fixtures
│   └── support/                # Support files
└── jest.config.js              # Jest configuration
```

## Unit Testing

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
};
```

### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom';
import { server } from './__tests__/test-utils/msw-server';

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock global fetch
global.fetch = jest.fn();

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
};
```

### Writing Unit Tests

#### Function Tests

```typescript
// __tests__/unit/lib/ai/embeddings.test.ts
import { generateEmbedding } from '@/lib/ai/embeddings';

describe('generateEmbedding', () => {
  it('should generate embeddings with the correct dimensions', async () => {
    // Mock the embedding pipeline
    jest.mock('@xenova/transformers', () => ({
      pipeline: jest.fn().mockResolvedValue({
        __call__: jest.fn().mockResolvedValue({
          data: new Float32Array(384).fill(0.1),
        }),
      }),
    }));

    const text = 'This is a test sentence';
    const embedding = await generateEmbedding(text);

    expect(embedding).toBeDefined();
    expect(embedding.dimensions).toBe(384);
    expect(embedding.values.length).toBe(384);
  });
});
```

#### Component Tests

```typescript
// __tests__/unit/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Custom Render Function

```typescript
// __tests__/test-utils/render-utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Test Data Generators

```typescript
// __tests__/test-utils/test-data.ts
import { User, Memory } from '@prisma/client';

export function generateUser(overrides = {}): User {
  return {
    id: `user-${Math.random().toString(36).substring(2, 9)}`,
    email: `user-${Math.random().toString(36).substring(2, 9)}@example.com`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function generateMemory(overrides = {}): Memory {
  return {
    id: `memory-${Math.random().toString(36).substring(2, 9)}`,
    content: `Test memory content ${Math.floor(Math.random() * 1000)}`,
    importance: Math.random(),
    createdAt: new Date(),
    userId: `user-${Math.random().toString(36).substring(2, 9)}`,
    sessionId: null,
    ...overrides,
  };
}

export function generateEmbeddingVector(dimensions = 384): number[] {
  return Array.from({ length: dimensions }, () => Math.random() - 0.5);
}
```

## Integration Testing

### API Mocking with MSW

```typescript
// __tests__/test-utils/msw-server.ts
import { setupServer } from 'msw/node';
import { handlers } from './server-handlers';

export const server = setupServer(...handlers);
```

```typescript
// __tests__/test-utils/server-handlers.ts
import { rest } from 'msw';
import { generateUser, generateMemory } from './test-data';

export const handlers = [
  rest.get('/api/user/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.status(200), ctx.json(generateUser({ id })));
  }),

  rest.get('/api/memories', (req, res, ctx) => {
    const userId = req.url.searchParams.get('userId');
    return res(
      ctx.status(200),
      ctx.json([generateMemory({ userId }), generateMemory({ userId }), generateMemory({ userId })])
    );
  }),

  rest.post('/api/memory', async (req, res, ctx) => {
    const { content, userId } = await req.json();
    return res(ctx.status(201), ctx.json(generateMemory({ content, userId })));
  }),
];
```

### Integration Test Example

```typescript
// __tests__/integration/memory-management.test.tsx
import { render, screen, fireEvent, waitFor } from '@/test-utils/render-utils';
import MemoryManager from '@/components/memory/MemoryManager';
import { server } from '@/test-utils/msw-server';
import { rest } from 'msw';
import { generateUser, generateMemory } from '@/test-utils/test-data';

describe('Memory Management Integration', () => {
  const user = generateUser();

  it('loads and displays user memories', async () => {
    // Setup mock response
    server.use(
      rest.get('/api/memories', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json([
            generateMemory({ content: 'First memory', userId: user.id }),
            generateMemory({ content: 'Second memory', userId: user.id }),
          ])
        );
      })
    );

    render(<MemoryManager userId={user.id} />);

    // Wait for memories to load
    await waitFor(() => {
      expect(screen.getByText('First memory')).toBeInTheDocument();
      expect(screen.getByText('Second memory')).toBeInTheDocument();
    });
  });

  it('creates a new memory', async () => {
    render(<MemoryManager userId={user.id} />);

    // Fill the form
    fireEvent.change(screen.getByLabelText(/memory content/i), {
      target: { value: 'New test memory' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/memory saved/i)).toBeInTheDocument();
    });
  });
});
```

## End-to-End Testing with Cypress

### Cypress Configuration

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});
```

### Cypress Test Example

```typescript
// cypress/e2e/memory-flow.cy.ts
describe('Memory Management Flow', () => {
  beforeEach(() => {
    // Setup test user and login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { success: true },
    }).as('login');

    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
    cy.url().should('include', '/dashboard');
  });

  it('should create and retrieve memories', () => {
    // Intercept memory creation
    cy.intercept('POST', '/api/memory', {
      statusCode: 201,
      body: { id: 'new-memory-id', content: 'Test memory content' },
    }).as('createMemory');

    // Navigate to memory page
    cy.visit('/memories');

    // Create new memory
    cy.get('button').contains('New Memory').click();
    cy.get('textarea[name="content"]').type('Test memory content');
    cy.get('button[type="submit"]').click();

    // Wait for creation and verify
    cy.wait('@createMemory');
    cy.get('.success-message').should('be.visible');

    // Verify memory appears in list
    cy.get('.memory-list').should('contain', 'Test memory content');
  });

  it('should search for memories', () => {
    // Intercept search request
    cy.intercept('GET', '/api/memories/search*', {
      statusCode: 200,
      body: [
        { id: 'memory-1', content: 'First test memory' },
        { id: 'memory-2', content: 'Second test memory' },
      ],
    }).as('searchMemories');

    // Navigate to memory page
    cy.visit('/memories');

    // Search for memories
    cy.get('input[name="search"]').type('test memory');
    cy.get('button').contains('Search').click();

    // Wait for search and verify results
    cy.wait('@searchMemories');
    cy.get('.memory-list').should('contain', 'First test memory');
    cy.get('.memory-list').should('contain', 'Second test memory');
  });
});
```

## Visual Regression Testing

### Storybook Setup

```javascript
// .storybook/main.js
module.exports = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
};
```

### Component Story Example

```typescript
// components/ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'md',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
};
```

### Visual Regression with Chromatic

```json
// package.json (scripts section)
{
  "scripts": {
    "chromatic": "npx chromatic --project-token=YOUR_PROJECT_TOKEN"
  }
}
```

## Testing AI Components

### Mocking AI Models

```typescript
// __mocks__/@xenova/transformers.js
const mockPipeline = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    __call__: jest.fn().mockImplementation((text) => {
      // Generate deterministic embeddings based on input text
      const hash = Array.from(text).reduce(
        (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
        0
      );
      const seed = Math.abs(hash) / 2147483647;

      // Generate deterministic vector
      const data = new Float32Array(384);
      for (let i = 0; i < data.length; i++) {
        // Use a simple PRNG with the seed
        const x = Math.sin(seed * i) * 10000;
        data[i] = x - Math.floor(x) - 0.5;
      }

      return Promise.resolve({ data });
    }),
  });
});

module.exports = {
  pipeline: mockPipeline,
};
```

### Testing Vector Operations

```typescript
// __tests__/unit/lib/ai/vector-operations.test.ts
import { cosineSimilarity, euclideanDistance } from '@/lib/ai/vector-operations';

describe('Vector Operations', () => {
  it('calculates cosine similarity correctly', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const v3 = [1, 1, 0];

    expect(cosineSimilarity(v1, v1)).toBeCloseTo(1);
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.7071, 4);
  });

  it('calculates euclidean distance correctly', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const v3 = [1, 1, 0];

    expect(euclideanDistance(v1, v1)).toBeCloseTo(0);
    expect(euclideanDistance(v1, v2)).toBeCloseTo(Math.sqrt(2));
    expect(euclideanDistance(v1, v3)).toBeCloseTo(1);
  });
});
```

## Performance Testing

```typescript
// __tests__/performance/model-loading.test.ts
import { loadModel } from '@/lib/ai/model';
import { performance } from 'perf_hooks';

describe('Model Loading Performance', () => {
  it('loads model within acceptable time', async () => {
    const start = performance.now();

    await loadModel({
      modelName: 'test-model',
      quantization: '8bit',
      useGPU: false,
    });

    const end = performance.now();
    const loadTime = end - start;

    console.log(`Model loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
  }, 10000); // 10 second timeout
});
```

## Test Coverage

Aim for high test coverage, especially for critical paths:

- **Unit Tests**: 80%+ coverage for utility functions and components
- **Integration Tests**: Cover all major user flows
- **E2E Tests**: Cover critical business paths

Run coverage reports regularly:

```bash
npm run test:coverage
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Meaningful Assertions**: Test behavior, not implementation details
4. **Mock External Dependencies**: Use mocks for external services and APIs
5. **Test Edge Cases**: Include tests for error conditions and edge cases
6. **Readable Tests**: Write clear, descriptive test names and assertions
7. **Fast Tests**: Keep tests fast to encourage frequent running
8. **CI Integration**: Run tests automatically in CI pipeline

## Debugging Tests

### Jest Debugging

```bash
# Run a specific test file
npm test -- path/to/test.ts

# Run tests with a specific name pattern
npm test -- -t "pattern"

# Run tests in watch mode
npm test -- --watch

# Debug tests with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.ts
```

### Cypress Debugging

```bash
# Open Cypress UI
npm run cypress:open

# Run specific test file
npm run cypress:run -- --spec "cypress/e2e/specific-test.cy.ts"
```

## Python Testing with pytest

### Pytest Configuration

```ini
# pytest.ini
[pytest]
testpaths = python/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

# Display options
addopts =
    --verbose
    --color=yes
    --durations=10
    --showlocals
    --tb=native

# Custom markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    gpu: marks tests that require GPU (deselect with '-m "not gpu"')
    integration: marks integration tests (deselect with '-m "not integration"')
    performance: marks performance tests (deselect with '-m "not performance"')
```

### Coverage Configuration

```ini
# .coveragerc
[run]
source = python
omit =
    */tests/*
    */__pycache__/*
    */.venv/*
    */venv/*
    */node_modules/*
    */site-packages/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
    pass
```

### Writing Pytest Tests

#### Unit Test Example

```python
# python/tests/unit/models/test_embedding.py
import pytest
import torch
from models.embedding import EmbeddingModel

class TestEmbeddingModel:
    """Tests for the EmbeddingModel class."""

    def test_initialization(self, embedding_model):
        """Test that the model initializes correctly."""
        assert embedding_model.model_name == "sentence-transformers/all-MiniLM-L6-v2"
        assert embedding_model.device in ["cuda", "cpu"]
        assert embedding_model.max_length == 512

    def test_encode_single_text(self, embedding_model, sample_texts):
        """Test encoding a single text."""
        text = sample_texts[0]
        embedding = embedding_model.encode(text)

        # Check shape and normalization
        assert isinstance(embedding, torch.Tensor)
        assert embedding.dim() == 2
        assert embedding.size(0) == 1
        assert torch.allclose(torch.norm(embedding, dim=1), torch.ones(1), atol=1e-5)

    def test_similarity(self, embedding_model, sample_texts):
        """Test similarity calculation between embeddings."""
        embedding1 = embedding_model.encode(sample_texts[0])
        embedding2 = embedding_model.encode(sample_texts[1])

        similarity = embedding_model.similarity(embedding1, embedding2)

        assert isinstance(similarity, torch.Tensor)
        assert similarity.item() >= -1.0 and similarity.item() <= 1.0
```

#### Integration Test Example

```python
# python/tests/integration/api/test_api.py
import pytest
from fastapi.testclient import TestClient
from api.main import app

class TestAPI:
    """Tests for the FastAPI application."""

    def test_get_status(self, client):
        """Test the status endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "model" in data

    def test_create_embedding(self, client):
        """Test the embedding endpoint."""
        response = client.post(
            "/embed",
            json={"texts": "This is a test sentence.", "normalize": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 1
```

#### Performance Test Example

```python
# python/tests/performance/test_embedding_performance.py
import pytest
import torch
from models.embedding import EmbeddingModel

class TestEmbeddingPerformance:
    """Performance tests for the EmbeddingModel class."""

    def test_encode_performance(self, embedding_model, sample_texts, benchmark):
        """Test the performance of the encode method."""
        # Benchmark the encode method
        benchmark(lambda: embedding_model.encode(sample_texts))

    def test_batch_encode_performance(self, embedding_model, large_sample_texts, benchmark):
        """Test the performance of the batch_encode method with different batch sizes."""
        def encode_with_batch_size_8():
            embedding_model.batch_encode(large_sample_texts, batch_size=8)

        def encode_with_batch_size_32():
            embedding_model.batch_encode(large_sample_texts, batch_size=32)

        # Run the benchmarks
        benchmark.pedantic(encode_with_batch_size_8, rounds=3, iterations=2)
        benchmark.pedantic(encode_with_batch_size_32, rounds=3, iterations=2)
```

### Pytest Fixtures

```python
# python/tests/conftest.py
import pytest
import torch
import random
import numpy as np

@pytest.fixture(scope="session", autouse=True)
def set_random_seed():
    """Set random seeds for reproducibility."""
    seed = 42
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

@pytest.fixture(scope="module")
def embedding_model():
    """Create an embedding model for testing."""
    from models.embedding import EmbeddingModel
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = EmbeddingModel(model_name=model_name, device=device)
    yield model
    # Clean up
    del model
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

@pytest.fixture
def sample_texts():
    """Provide sample texts for testing."""
    return [
        "This is a sample text for testing embeddings.",
        "PyTorch is a machine learning framework.",
        "Natural language processing is fascinating."
    ]

@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from fastapi.testclient import TestClient
    from api.main import app
    with TestClient(app) as test_client:
        yield test_client
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test categories
pytest python/tests/unit
pytest python/tests/integration
pytest python/tests/performance

# Run with coverage
pytest --cov=python

# Run tests that don't require GPU
pytest -m "not gpu"
```

## Code Quality with pylint

### Pylint Configuration

```ini
# .pylintrc
[MASTER]
py-version = 3.10
jobs=4
fail-under=8.0

[MESSAGES CONTROL]
disable=
    C0103, # Invalid name
    C0111, # Missing docstring
    W0511, # FIXME/TODO
    R0903, # Too few public methods

[FORMAT]
max-line-length=100
```

### Running Pylint

```bash
# Run pylint on all Python files
pylint python

# Run pylint on specific files or directories
pylint python/models
pylint python/api

# Run with detailed reports
pylint --reports=y python
```

### Code Formatting with Black

```bash
# Format all Python files
black python

# Check formatting without changing files
black --check python
```

### Import Sorting with isort

```bash
# Sort imports in all Python files
isort python

# Check import sorting without changing files
isort --check python
```

### Best Practices for Python Testing

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.
2. **Use Fixtures**: Use fixtures for common setup and teardown operations.
3. **Mock External Dependencies**: Use mocking to isolate the code being tested.
4. **Test Edge Cases**: Include tests for edge cases and error conditions.
5. **Keep Tests Fast**: Tests should run quickly to encourage frequent testing.
6. **Test Coverage**: Aim for high test coverage, especially for critical components.
7. **Readable Tests**: Write clear, descriptive test names and assertions.
8. **GPU-Specific Tests**: Use markers to identify tests that require GPU acceleration.
9. **Performance Benchmarks**: Use pytest-benchmark to track performance over time.
10. **Continuous Integration**: Run tests automatically on every commit.
