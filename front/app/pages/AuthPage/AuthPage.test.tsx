import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthPage } from './AuthPage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/entities/user/model/UserContext', () => ({
  useUser: () => ({ user: null, loading: false, setUser: vi.fn() }),
}));

vi.mock('@/app/shared/api/auth.api', () => ({
  AUTH_API: { login: vi.fn(), register: vi.fn() },
}));

describe('AuthPage', () => {
  it('starts in login mode', () => {
    render(<AuthPage />);

    expect(screen.getByRole('tab', { name: 'Log in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('switches to register mode via the tabs, swapping the form', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(screen.getByRole('tab', { name: 'Register' }));

    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('switches to register mode via the footer prompt, kept in sync with the tabs', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });
});
