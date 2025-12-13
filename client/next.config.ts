import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
};

export default nextConfig;
