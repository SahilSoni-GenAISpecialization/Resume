import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/profile/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
      {
        source: '/dashboard/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
      {
        source: '/search/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;