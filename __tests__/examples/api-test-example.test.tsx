import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils/render-utils';
import { generateUser } from '../test-utils/test-data';

// Example component that fetches and displays user data
const UserProfile = () => {
  const [user, setUser] = React.useState<ReturnType<typeof generateUser> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    fetchUser();
  }, []);

  if (error) return <div role="alert">{error}</div>;
  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button>Edit Profile</button>
    </div>
  );
};

describe('UserProfile Component with API', () => {
  const mockUser = generateUser();

  beforeEach(() => {
    // Reset fetch mock before each test
    (global.fetch as jest.Mock).mockReset();
  });

  it('displays loading state initially', () => {
    render(<UserProfile />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays user data after successful fetch', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(<UserProfile />);

    // Wait for loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify user data is displayed
    expect(screen.getByRole('heading', { name: mockUser.name })).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<UserProfile />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch user');
    });
  });

  it('handles user interaction after data load', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const user = userEvent.setup();
    render(<UserProfile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Test button interaction
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);

    // Add assertions for expected behavior after click
    // This is just an example - in a real test, you'd verify the actual behavior
    await waitFor(() => {
      expect(editButton).toBeEnabled();
    });
  });
});
