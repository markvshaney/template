# Testing Documentation

This directory contains our testing infrastructure and examples for the project.

## Directory Structure

```
__tests__/
├── examples/                    # Example tests demonstrating best practices
│   ├── component-test-example.test.tsx
│   ├── api-test-example.test.tsx
│   └── msw-api-example.test.tsx
├── test-utils/                  # Shared test utilities
│   ├── render-utils.tsx         # Custom render function with providers
│   ├── test-data.ts             # Test data generators
│   ├── server-handlers.ts       # MSW request handlers
│   └── msw-server.ts            # MSW server setup
└── README.md                    # This file
```

## Testing Setup

We use the following testing libraries and tools:

- Jest: Test runner
- React Testing Library: Component testing
- Jest DOM: DOM testing utilities
- User Event: User interaction simulation
- MSW (Mock Service Worker): API mocking
- Faker: Test data generation

## Best Practices

1. **Component Testing**

   - Use `render` from `test-utils/render-utils.tsx` for consistent provider wrapping
   - Test user interactions using `userEvent` instead of `fireEvent`
   - Use semantic queries (getByRole, getByText) over test IDs
   - Test component behavior, not implementation details

2. **Test Data**

   - Use the test data generators from `test-utils/test-data.ts`
   - Generate fresh data for each test to prevent test interdependence
   - Use realistic data that matches your application's data structure

3. **API Mocking**

   - Use MSW for mocking API responses when possible
   - If you encounter issues with MSW in Jest, use direct fetch mocking (see alternative approach below)
   - Create reusable handlers in `test-utils/server-handlers.ts`
   - Override handlers in specific tests as needed
   - Test error states and edge cases

4. **Async Testing**

   - Use `waitFor` for asynchronous operations
   - Handle loading states appropriately
   - Test error states and edge cases

5. **Test Organization**
   - Group related tests using `describe` blocks
   - Use clear, descriptive test names
   - Follow the Arrange-Act-Assert pattern
   - Keep tests focused and isolated

## Example Usage

### Component Testing

```typescript
import { render, screen } from "../test-utils/render-utils";
import { generateUser } from "../test-utils/test-data";

describe("MyComponent", () => {
  it("renders correctly", () => {
    const user = generateUser();
    render(<MyComponent user={user} />);

    expect(screen.getByRole("heading")).toHaveTextContent(user.name);
  });
});
```

### API Mocking with MSW

```typescript
import { render, screen, waitFor } from "../test-utils/render-utils";
import { server } from "../test-utils/msw-server";
import { http, HttpResponse } from "msw";

describe("API Component", () => {
  it("handles API error", async () => {
    // Override default handler for this test
    server.use(
      http.get("/api/user", () => {
        return HttpResponse.json({ error: "Failed" }, { status: 500 });
      })
    );

    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText("Error:")).toBeInTheDocument();
    });
  });
});
```

### Alternative: Direct Fetch Mocking

If you encounter issues with MSW in Jest, you can use direct fetch mocking as an alternative:

```typescript
import { render, screen, waitFor } from "../test-utils/render-utils";
import { generateUser } from "../test-utils/test-data";

// Store original fetch
const originalFetch = global.fetch;

// Create mock user
const mockUser = generateUser();

// Add type for our custom mock fetch
interface MockFetch extends jest.Mock {
  mockErrorOnce: boolean;
}

describe("API Component", () => {
  // Setup mock fetch before tests
  beforeEach(() => {
    // Create mock fetch function
    const mockFetch = jest.fn().mockImplementation(async (url) => {
      if (url === '/api/user') {
        return {
          ok: true,
          status: 200,
          json: async () => mockUser
        };
      }
      return { ok: false, status: 404 };
    }) as MockFetch;

    // Replace global fetch
    global.fetch = mockFetch;
  });

  // Restore original fetch after tests
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("displays user data from mock", async () => {
    render(<UserProfile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole("heading")).toHaveTextContent(mockUser.name);
    });
  });

  it("handles API error", async () => {
    // Mock fetch to throw an error
    global.fetch = jest.fn().mockImplementationOnce(() => {
      throw new Error("Network error");
    });

    render(<UserProfile />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Coverage Requirements

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Additional Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
