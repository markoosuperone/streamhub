import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuthTabs } from './AuthTabs';

describe('AuthTabs', () => {
  it('marks the current mode as the selected tab', () => {
    render(<AuthTabs mode="login" onModeChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Log in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Register' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onModeChange with "register" when the register tab is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<AuthTabs mode="login" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('tab', { name: 'Register' }));

    expect(onModeChange).toHaveBeenCalledWith('register');
  });

  it('calls onModeChange with "login" when the login tab is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<AuthTabs mode="register" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('tab', { name: 'Log in' }));

    expect(onModeChange).toHaveBeenCalledWith('login');
  });
});
