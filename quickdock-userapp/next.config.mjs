/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["quickdock-shared"],
  experimental: { externalDir: true },
};
export default nextConfig;
