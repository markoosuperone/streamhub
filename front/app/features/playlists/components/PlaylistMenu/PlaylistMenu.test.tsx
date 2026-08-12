import type { PlaylistResponseDTO } from '@superplayer/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/app/shared/api/api.error';

import { PlaylistMenu } from './PlaylistMenu';

const PLAYLIST = { id: 'p1', title: 'Road Trip' } as PlaylistResponseDTO;

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'More options' }));
  return user;
}

describe('PlaylistMenu', () => {
  it('shows Rename and Delete options when opened', async () => {
    render(<PlaylistMenu playlist={PLAYLIST} onRename={vi.fn()} onDelete={vi.fn()} />);

    await openMenu();

    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renames: submits the new title and closes the menu on success', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(<PlaylistMenu playlist={PLAYLIST} onRename={onRename} onDelete={vi.fn()} />);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByDisplayValue('Road Trip');
    await user.clear(input);
    await user.type(input, 'Summer Mix');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onRename).toHaveBeenCalledWith('p1', 'Summer Mix');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renames: Save is disabled when the title is unchanged', async () => {
    render(<PlaylistMenu playlist={PLAYLIST} onRename={vi.fn()} onDelete={vi.fn()} />);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renames: shows the API error and keeps the menu open on failure', async () => {
    const onRename = vi.fn().mockRejectedValue(new ApiError(409, 'Title already in use'));
    render(<PlaylistMenu playlist={PLAYLIST} onRename={onRename} onDelete={vi.fn()} />);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByDisplayValue('Road Trip');
    await user.clear(input);
    await user.type(input, 'Summer Mix');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Title already in use')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('deletes: confirming calls onDelete and closes the menu', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<PlaylistMenu playlist={PLAYLIST} onRename={vi.fn()} onDelete={onDelete} />);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete "Road Trip"?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes: Cancel returns to the menu list without deleting', async () => {
    const onDelete = vi.fn();
    render(<PlaylistMenu playlist={PLAYLIST} onRename={vi.fn()} onDelete={onDelete} />);
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });
});
