import { defineConfig, devices } from '@playwright/test';

import { STORAGE_STATE_PATH } from './global-setup';

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // /register (5/min) and /login (10/min) are rate-limited server-side (see
  // server/src/auth/infrastructure/http/auth.route.ts) — running this small
  // auth suite in parallel across several workers can trip those limits
  // within the same window. Serial execution keeps the suite's own call
  // volume well under them without needing per-worker fixture juggling.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    // Every test starts already logged in as the shared user (see
    // global-setup.ts) — auth.spec.ts, which tests login/logout/register
    // themselves, opts back out per-file with its own storageState override.
    storageState: STORAGE_STATE_PATH,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // In local dev, both servers are typically already running (started by
  // hand for manual testing) — reuseExistingServer picks those up instead of
  // spawning duplicates. In CI, Playwright starts both itself and waits for
  // the health check / root response before running any test.
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      cwd: '../front',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
