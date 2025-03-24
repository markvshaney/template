import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils/render-utils';
import { generateUser } from '../test-utils/test-data';

type User = ReturnType<typeof generateUser>;

// Mock global fetch for our tests
const mockUser = generateUser();

// Add type for our custom mock fetch
interface MockFetch extends jest.Mock {
  mockErrorOnce: boolean;
}

const mockFetch = jest.fn().mockImplementation(async (url) => {
  if (url === '/api/user') {
    if ((mockFetch as MockFetch).mockErrorOnce) {
      (mockFetch as MockFetch).mockErrorOnce = false;
      return {
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => mockUser,
    };
  }
  return { ok: false, status: 404 };
}) as MockFetch;

// Initialize the mock property
(mockFetch as MockFetch).mockErrorOnce = false;

// Store the original fetch
const originalFetch = global.fetch;

// Component that fetches and displays user data
const UserProfile = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user');
        const data = await response.json();
        setUser(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div data-testid="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button>Contact User</button>
    </div>
  );
};

describe('MSW API Example', () => {
  // Setup mock fetch before tests
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockErrorOnce = false;
  });

  // Restore original fetch after tests
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('displays user data from mock', async () => {
    render(<UserProfile />);

    // Verify loading state appears
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for user data to load
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    // Verify the user data is displayed
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/@/)).toBeInTheDocument(); // Email contains @ symbol
  });

  it('handles API error', async () => {
    // Modify mock to actually throw an error
    mockFetch.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    render(<UserProfile />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    // Verify error message is displayed
    expect(screen.getByTestId('error')).toHaveTextContent('Network error');
  });

  it('handles user interaction after data loads', async () => {
    const user = userEvent.setup();
    render(<UserProfile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    // Interact with the button
    const button = screen.getByRole('button', { name: /contact user/i });
    await user.click(button);

    // In a real test, you'd verify the button click result
    // This is just an example
    expect(button).toBeInTheDocument();
  });
});
