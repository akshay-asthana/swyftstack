/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // quickdock-shared is a TS workspace package consumed directly.
  transpilePackages: ["quickdock-shared"],
  experimental: { externalDir: true },
};

export default nextConfig;
