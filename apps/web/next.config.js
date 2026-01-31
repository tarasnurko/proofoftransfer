/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude these packages from server bundling
  serverExternalPackages: ['@aztec/bb.js', '@noir-lang/noir_js'],
  turbopack: {},
};

export default nextConfig;
