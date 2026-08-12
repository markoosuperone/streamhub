import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/library',
}));

const { MediaSearchInput } = await import('./MediaSearchInput');

beforeEach(() => {
  replace.mockClear();
  window.history.pushState({}, '', '/library');
});

describe('MediaSearchInput', () => {
  it('replaces the URL with a q param for the typed value', async () => {
    const user = userEvent.setup();
    render(<MediaSearchInput />);

    await user.type(screen.getByPlaceholderText('Search tracks, videos, creators…'), 'lofi');

    expect(replace).toHaveBeenLastCalledWith('/library?q=lofi');
  });

  it('omits the q param entirely for an empty/whitespace-only value', async () => {
    const user = userEvent.setup();
    render(<MediaSearchInput />);

    await user.type(screen.getByPlaceholderText('Search tracks, videos, creators…'), '  ');

    expect(replace).toHaveBeenLastCalledWith('/library');
  });

  it('preserves an active filter param already in the URL when searching', async () => {
    window.history.pushState({}, '', '/library?filter=audio');
    const user = userEvent.setup();
    render(<MediaSearchInput />);

    await user.type(screen.getByPlaceholderText('Search tracks, videos, creators…'), 'x');

    expect(replace).toHaveBeenLastCalledWith('/library?filter=audio&q=x');
  });
});
