import type { MediaResponseDTO } from '@superplayer/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/app/shared/api/api.error';

const del = vi.fn();
vi.mock('@/app/shared/api/media.api', () => ({
  MEDIA_API: { delete: (...args: unknown[]) => del(...args) },
}));

const { MediaCardMenu } = await import('./MediaCardMenu');

const MEDIA = { id: 'm1', title: 'Lo-Fi Beats' } as MediaResponseDTO;

async function openMenuAndDelete() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'More options' }));
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  return user;
}

beforeEach(() => {
  del.mockReset();
});

describe('MediaCardMenu', () => {
  it('shows a delete confirmation with the media title', async () => {
    render(<MediaCardMenu media={MEDIA} onDeleted={vi.fn()} />);

    await openMenuAndDelete();

    expect(screen.getByText('Delete "Lo-Fi Beats"?')).toBeInTheDocument();
  });

  it('deletes via the API, notifies onDeleted, and closes the menu on success', async () => {
    del.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(<MediaCardMenu media={MEDIA} onDeleted={onDeleted} />);
    const user = await openMenuAndDelete();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(del).toHaveBeenCalledWith('m1');
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the API error and stays open without calling onDeleted on failure', async () => {
    del.mockRejectedValue(new ApiError(403, 'Not your upload'));
    const onDeleted = vi.fn();
    render(<MediaCardMenu media={MEDIA} onDeleted={onDeleted} />);
    const user = await openMenuAndDelete();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Not your upload')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('Cancel returns to the trigger state without deleting', async () => {
    render(<MediaCardMenu media={MEDIA} onDeleted={vi.fn()} />);
    const user = await openMenuAndDelete();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(del).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByText('Delete "Lo-Fi Beats"?')).not.toBeInTheDocument();
  });
});
