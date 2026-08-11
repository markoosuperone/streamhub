// Runs exactly once for the whole run, in its own process, before any worker
// spawns — unlike a describe-scoped beforeAll (which re-runs per worker, and
// can run again if Playwright restarts a worker after a failure), this can't
// silently duplicate the shared user and risk the /register rate limit
// (5/min, see server/src/auth/infrastructure/http/auth.route.ts).
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_STATE_PATH = path.join(currentDir, '.auth', 'shared-user.json');

async function globalSetup() {
  const email = `shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
  const password = 'password123';

  // Raw fetch, not a browser — registering doesn't need a UI, and this is
  // the one call that must stay singular (see the rate-limit note above).
  const response = await fetch(`${BACKEND_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Global setup: failed to register the shared e2e user (${response.status})`);
  }

  // Workers are forked from this process after globalSetup resolves, and
  // inherit process.env at that point.
  process.env.E2E_SHARED_EMAIL = email;
  process.env.E2E_SHARED_PASSWORD = password;

  // Log in once via the real UI flow and persist the resulting cookies as
  // storageState — playwright.config.ts makes this the default for every
  // test, so individual tests start already authenticated instead of each
  // one driving its own login. /login is capped at 10/min server-side;
  // dozens of tests each logging in fresh would trip that once the suite
  // runs together, which is exactly what happened before this existed.
  // auth.spec.ts (which tests the login/logout flow itself) opts back out
  // with its own `test.use({ storageState: { cookies: [], origins: [] } })`.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${FRONTEND_URL}/auth`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(FRONTEND_URL + '/');
  await page.context().storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
