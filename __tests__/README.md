# Testing Documentation

This directory contains our testing infrastructure and examples for the project.

## Directory Structure

```
__tests__/
├── examples/                    # Example tests demonstrating best practices
│   ├── component-test-example.test.tsx
│   └── api-test-example.test.ts
├── test-utils/                  # Shared test utilities
│   ├── render-utils.tsx        # Custom render function with providers
│   └── test-data.ts           # Test data generators
└── README.md                   # This file
```

## Testing Setup

We use the following testing libraries and tools:

- Jest: Test runner
- React Testing Library: Component testing
- Jest DOM: DOM testing utilities
- User Event: User interaction simulation
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

3. **Async Testing**

   - Use `waitFor` for asynchronous operations
   - Handle loading states appropriately
   - Test error states and edge cases

4. **Test Organization**
   - Group related tests using `describe` blocks
   - Use clear, descriptive test names
   - Follow the Arrange-Act-Assert pattern
   - Keep tests focused and isolated

## Example Usage

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
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
