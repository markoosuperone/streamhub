import { expect, test, type Page } from '@playwright/test';

// This file tests the login/logout/register flow itself, so it opts out of
// the shared-user storageState playwright.config.ts applies by default to
// every other test file — those start already authenticated; these need to
// start logged out.
test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = 'password123';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

async function register(page: Page, email: string, password: string = PASSWORD) {
  await page.goto('/auth');
  await page.click('#register-tab');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function login(page: Page, email: string, password: string = PASSWORD) {
  await page.goto('/auth');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// AuthForm's own error <p role="alert"> isn't the only role=alert on the
// page — Next's route announcer (#__next-route-announcer__) has one too, so
// a bare getByRole('alert') is a strict-mode violation. Scope to the form.
function authError(page: Page) {
  return page.locator('form').getByRole('alert');
}

test.describe('register', () => {
  test('creates an account and lands on the authenticated home page', async ({ page }) => {
    await register(page, uniqueEmail('register'));

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('shows an error and stays on the auth page for a duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup');
    await register(page, email);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/auth');

    await page.click('#register-tab');
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(authError(page)).not.toBeEmpty();
    await expect(page).toHaveURL(/\/auth$/);
  });
});

test.describe('login and session, using one shared account', () => {
  // /register is capped at 5/min server-side — the tests below only need a
  // *logged-in* session, not to exercise registration itself, so they share
  // one account (registered once in global-setup.ts, not a describe-scoped
  // beforeAll — that re-runs per worker and again if a worker restarts after
  // a failure, which can double up on register calls) and log in via the UI
  // per test instead of each registering their own (see the register
  // describe block above for coverage of the register flow itself).
  const sharedEmail = process.env.E2E_SHARED_EMAIL!;
  const sharedPassword = process.env.E2E_SHARED_PASSWORD!;

  test('logs in with valid credentials and lands on home', async ({ page }) => {
    await login(page, sharedEmail, sharedPassword);

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('shows an error and stays on the auth page for the wrong password', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('#email', sharedEmail);
    await page.fill('#password', 'not-the-right-password');
    await page.click('button[type="submit"]');

    await expect(authError(page)).not.toBeEmpty();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('logout clears the session and protected routes redirect back to auth', async ({ page }) => {
    await login(page, sharedEmail, sharedPassword);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('/auth');

    // proxy.ts gates protected routes on the refresh_token cookie — after
    // sign-out it's cleared, so a direct visit bounces straight back to /auth.
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('stays logged in across a reload', async ({ page }) => {
    await login(page, sharedEmail, sharedPassword);

    await page.reload();

    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('recovers the session via refresh-token when the access token cookie is missing', async ({
    page,
    context,
  }) => {
    await login(page, sharedEmail, sharedPassword);

    // The access token is short-lived and the refresh token long-lived by
    // design (see server/README.md) — dropping only the access_token cookie
    // simulates natural expiry and forces requireSession() down its refresh
    // path instead of the fast "already have a token" path. Re-adding the
    // remaining cookies explicitly (rather than relying on clearCookies'
    // name filter) keeps this independent of that API's exact semantics.
    const cookiesBefore = await context.cookies();
    const accessCookie = cookiesBefore.find((cookie) => cookie.name === 'access_token');
    const refreshCookie = cookiesBefore.find((cookie) => cookie.name === 'refresh_token');
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();

    await context.clearCookies();
    await context.addCookies(cookiesBefore.filter((cookie) => cookie.name !== 'access_token'));

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    // requireSession()'s refresh + cookie write happens as part of the /api/me
    // response that the "Sign out" button visibility above already implies
    // succeeded, but context.cookies() is its own async round-trip (over CDP)
    // to the browser's cookie jar — it isn't guaranteed to observe that write
    // the instant the response resolves. expect.poll retries the read instead
    // of trusting a single-shot check right after, which was flaky under the
    // extra load of running as part of the full suite (never in isolation).
    //
    // Not asserting the new token's value differs from the old one: the JWT's
    // claims (user_id, session_id, iat, exp) are second-granularity, so a
    // refresh landing in the same second as the original login can
    // legitimately produce a byte-identical token. A cookie existing again
    // after being removed is what actually demonstrates the refresh ran.
    await expect
      .poll(
        async () => {
          const cookiesAfter = await context.cookies();
          return cookiesAfter.find((cookie) => cookie.name === 'access_token')?.value;
        },
        { timeout: 15_000 },
      )
      .toBeTruthy();
  });

  test('redirects an authenticated visitor away from /auth to home', async ({ page }) => {
    await login(page, sharedEmail, sharedPassword);

    await page.goto('/auth');

    await expect(page).toHaveURL('/');
  });
});

test.describe('route gating', () => {
  test('redirects an unauthenticated visitor from a protected route to /auth', async ({ page }) => {
    await page.goto('/library');

    await expect(page).toHaveURL(/\/auth$/);
  });
});
