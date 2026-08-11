import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/app/shared/api/api.error';

import { AuthForm } from './AuthForm';

const push = vi.fn();
const setUser = vi.fn();
const login = vi.fn();
const register = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/app/entities/user/model/UserContext', () => ({
  useUser: () => ({ user: null, loading: false, setUser }),
}));

vi.mock('@/app/shared/api/auth.api', () => ({
  AUTH_API: {
    login: (body: unknown) => login(body),
    register: (body: unknown) => register(body),
  },
}));

const CREDENTIALS = { email: 'a@b.com', password: 'password123' };
const AUTHED_USER = { id: 'user-1', email: CREDENTIALS.email };

async function fillAndSubmit(submitLabel: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), CREDENTIALS.email);
  await user.type(screen.getByLabelText('Password'), CREDENTIALS.password);
  await user.click(screen.getByRole('button', { name: submitLabel }));
}

describe('AuthForm', () => {
  beforeEach(() => {
    push.mockClear();
    setUser.mockClear();
    login.mockClear();
    register.mockClear();
  });

  it('submits the entered credentials to AUTH_API.login in login mode', async () => {
    login.mockResolvedValue(AUTHED_USER);
    render(<AuthForm mode="login" />);

    await fillAndSubmit('Log in');

    await waitFor(() => expect(login).toHaveBeenCalledWith(CREDENTIALS));
    expect(register).not.toHaveBeenCalled();
  });

  it('submits the entered credentials to AUTH_API.register in register mode', async () => {
    register.mockResolvedValue(AUTHED_USER);
    render(<AuthForm mode="register" />);

    await fillAndSubmit('Create account');

    await waitFor(() => expect(register).toHaveBeenCalledWith(CREDENTIALS));
    expect(login).not.toHaveBeenCalled();
  });

  it('stores the returned user and navigates home on success', async () => {
    login.mockResolvedValue(AUTHED_USER);
    render(<AuthForm mode="login" />);

    await fillAndSubmit('Log in');

    await waitFor(() => expect(setUser).toHaveBeenCalledWith(AUTHED_USER));
    expect(push).toHaveBeenCalledWith('/');
  });

  it("shows the API error's message and does not navigate on failure", async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    render(<AuthForm mode="login" />);

    await fillAndSubmit('Log in');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(push).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it('shows a fallback error message for a non-ApiError failure', async () => {
    login.mockRejectedValue(new Error('network down'));
    render(<AuthForm mode="login" />);

    await fillAndSubmit('Log in');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('disables the submit button and shows a pending label while submitting', async () => {
    let resolveLogin: (value: typeof AUTHED_USER) => void = () => {};
    login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    render(<AuthForm mode="login" />);

    await fillAndSubmit('Log in');

    const pendingButton = await screen.findByRole('button', { name: 'Please wait…' });
    expect(pendingButton).toBeDisabled();

    resolveLogin(AUTHED_USER);
    await waitFor(() => expect(setUser).toHaveBeenCalled());
  });
});
