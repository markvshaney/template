import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils/render-utils';
import { generateUser } from '../test-utils/test-data';

// Example component to test
const UserProfile = ({ user }: { user: ReturnType<typeof generateUser> }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button>Edit Profile</button>
    </div>
  );
};

describe('UserProfile Component', () => {
  const user = generateUser();

  it('renders user information correctly', () => {
    render(<UserProfile user={user} />);

    // Test presence of elements
    expect(screen.getByRole('heading', { name: user.name })).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<UserProfile user={user} />);

    // Test button click
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);

    // Add assertions for expected behavior after click
    // This is just an example - in a real test, you'd verify the actual behavior
    await waitFor(() => {
      expect(editButton).toBeEnabled();
    });
  });
});
