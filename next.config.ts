import type { NextConfig } from "next";

const noStore = 'private, no-store, max-age=0, must-revalidate';
const noStoreHeaders = [
  { key: 'Cache-Control', value: noStore },
  { key: 'CDN-Cache-Control', value: 'no-store' },
  { key: 'Surrogate-Control', value: 'no-store' },
  { key: 'Vary', value: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept' },
  { key: 'X-Accel-Expires', value: '0' },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'applymatic.ca' }],
        destination: 'https://www.applymatic.ca/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/',
        headers: noStoreHeaders,
      },
      {
        source: '/login',
        headers: noStoreHeaders,
      },
      {
        source: '/contact',
        headers: noStoreHeaders,
      },
      {
        source: '/careers',
        headers: noStoreHeaders,
      },
      {
        source: '/privacy',
        headers: noStoreHeaders,
      },
      {
        source: '/terms',
        headers: noStoreHeaders,
      },
      {
        source: '/profile',
        headers: noStoreHeaders,
      },
      {
        source: '/profile/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/dashboard',
        headers: noStoreHeaders,
      },
      {
        source: '/dashboard/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/search',
        headers: noStoreHeaders,
      },
      {
        source: '/search/:path*',
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
