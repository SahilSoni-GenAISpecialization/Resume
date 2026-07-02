import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  // Smaller production bundle for VPS deploys (optional; `next start` still works without it)
  output: 'standalone',
};

export default nextConfig;