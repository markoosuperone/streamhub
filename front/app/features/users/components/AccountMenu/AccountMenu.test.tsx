import type { UserDTO } from '@superplayer/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const logout = vi.fn();
const setUser = vi.fn();
const resetPlayer = vi.fn();
const resetPlaylists = vi.fn();
const resetPlaylistItems = vi.fn();
let user: UserDTO | null = { user_id: 'user-1', email: 'ab@example.com' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/app/entities/user/model/UserContext', () => ({
  useUser: () => ({ user, setUser }),
}));

vi.mock('@/app/entities/player/model/usePlayerStore', () => ({
  usePlayerStore: (selector: (state: unknown) => unknown) => selector({ reset: resetPlayer }),
}));

vi.mock('@/app/entities/playlist/model/usePlaylistsStore', () => ({
  usePlaylistsStore: (selector: (state: unknown) => unknown) => selector({ reset: resetPlaylists }),
}));

vi.mock('@/app/entities/playlist/model/usePlaylistItemsStore', () => ({
  usePlaylistItemsStore: (selector: (state: unknown) => unknown) =>
    selector({ reset: resetPlaylistItems }),
}));

vi.mock('@/app/shared/api/auth.api', () => ({
  AUTH_API: { logout: (...args: unknown[]) => logout(...args) },
}));

const { AccountMenu } = await import('./AccountMenu');

beforeEach(() => {
  push.mockClear();
  logout.mockClear();
  setUser.mockClear();
  resetPlayer.mockClear();
  resetPlaylists.mockClear();
  resetPlaylistItems.mockClear();
  user = { user_id: 'user-1', email: 'ab@example.com' };
});

describe('AccountMenu', () => {
  it('shows the first two letters of the email as initials', () => {
    render(<AccountMenu />);

    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('signs out: calls the API, clears all app state, and navigates to /auth', async () => {
    logout.mockResolvedValue(undefined);
    const userClick = userEvent.setup();
    render(<AccountMenu />);

    await userClick.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalled();
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(null));
    expect(resetPlayer).toHaveBeenCalled();
    expect(resetPlaylists).toHaveBeenCalled();
    // Cached playlist tracks are the one store whose fetch is idempotent, so a
    // missed reset here would survive into the next user's session.
    expect(resetPlaylistItems).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/auth');
  });

  it('still clears local state and navigates even if the logout API call fails', async () => {
    // handleSignOut is a fire-and-forget onClick (try/finally, no catch) by
    // design — local state still clears either way, but the rejection isn't
    // swallowed, so it surfaces as a real unhandled rejection here same as it
    // would in a browser. Suppress just that expected one for this test.
    const handleUnhandledRejection = () => {};
    process.on('unhandledRejection', handleUnhandledRejection);

    try {
      logout.mockRejectedValue(new Error('network down'));
      const userClick = userEvent.setup();
      render(<AccountMenu />);

      await userClick.click(screen.getByRole('button', { name: 'Sign out' }));

      await waitFor(() => expect(setUser).toHaveBeenCalledWith(null));
      expect(resetPlayer).toHaveBeenCalled();
      expect(resetPlaylists).toHaveBeenCalled();
      expect(resetPlaylistItems).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/auth');
    } finally {
      process.removeListener('unhandledRejection', handleUnhandledRejection);
    }
  });
});
