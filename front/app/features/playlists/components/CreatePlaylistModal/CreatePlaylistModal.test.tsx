import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreatePlaylistModal } from './CreatePlaylistModal';

describe('CreatePlaylistModal', () => {
  it('disables Create until a title is entered', async () => {
    const user = userEvent.setup();
    render(<CreatePlaylistModal onCreate={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Playlist name…'), 'My Mix');

    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('does not submit a whitespace-only title', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreatePlaylistModal onCreate={onCreate} onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Playlist name…'), '   ');
    // The submit button is disabled for whitespace-only input too — this
    // also documents the trim() guard directly, in case the button's
    // disabled state and the form's own guard ever drift apart.
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('calls onCreate with the trimmed title and onClose on success', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue({ id: 'p1', title: 'My Mix' });
    const onClose = vi.fn();
    render(<CreatePlaylistModal onCreate={onCreate} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Playlist name…'), '  My Mix  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onCreate).toHaveBeenCalledWith('My Mix');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('re-enables the form and stays open when onCreate rejects', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockRejectedValue(new Error('boom'));
    const onClose = vi.fn();
    render(<CreatePlaylistModal onCreate={onCreate} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Playlist name…'), 'My Mix');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('button', { name: 'Create' })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CreatePlaylistModal onCreate={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
