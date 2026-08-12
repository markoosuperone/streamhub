import type { NextConfig } from 'next';
import path from 'path';

// Server-side only — deliberately not NEXT_PUBLIC_, so the backend's address
// cannot end up inlined in the browser bundle.
const API_URL = process.env.API_URL ?? 'http://localhost:8000';

const nextConfig: NextConfig = {
  transpilePackages: ['@superplayer/contracts'],
  turbopack: {
    root: path.join(__dirname, '..'),
  },
  // Keeps the browser on a single origin: it only ever calls /api/*, which is
  // proxied to the Fastify backend. That is what lets the auth cookies be
  // same-site and spares every request a CORS preflight. In production the same
  // mapping belongs in the reverse proxy, so media bytes skip Node entirely.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
