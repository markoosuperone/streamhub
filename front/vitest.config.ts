import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
    // Next.js bakes NEXT_PUBLIC_* vars into the client bundle at build time;
    // plain Vitest doesn't replicate that, so createApi's module-load-time
    // `process.env.NEXT_PUBLIC_API_URL` read needs these set explicitly,
    // matching .env's real values so route/base-URL assertions are meaningful.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
      NEXT_PUBLIC_BFF_URL: 'http://localhost:3000',
    },
  },
});
