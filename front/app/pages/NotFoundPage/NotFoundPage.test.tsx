import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/app/shared/routes';

import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('explains what happened', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  // The page renders outside the (main) group, so it has no TopBar — this link
  // is the only way back and must not silently disappear.
  it('offers a way back home', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', ROUTES.home);
  });
});
