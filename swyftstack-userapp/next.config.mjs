/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["swyftstack-shared"],
  experimental: { externalDir: true },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
  // Permanent 301 redirects from the old non-SEO-friendly slugs to the new
  // SEO-friendly canonical URLs. Any external link or stale crawl that
  // hits the old path gets bounced to the new one so we don't bleed link
  // equity.
  async redirects() {
    return [
      // Solutions: /for/* -> direct slugs
      { source: "/for/vibe-coders", destination: "/backend-for-vibe-coded-apps", permanent: true },
      { source: "/for/nextjs",      destination: "/nextjs-database",             permanent: true },
      { source: "/for/django",      destination: "/django-database",             permanent: true },
      { source: "/for/laravel",     destination: "/laravel-database",            permanent: true },
      { source: "/for/nodejs",      destination: "/nodejs-database",             permanent: true },

      // Alternatives: /vs/* -> /<vendor>-alternative
      { source: "/vs/supabase", destination: "/supabase-alternative",         permanent: true },
      { source: "/vs/railway",  destination: "/railway-alternative",          permanent: true },
      { source: "/vs/heroku",   destination: "/heroku-postgres-alternative",  permanent: true },
      { source: "/vs/render",   destination: "/render-alternative",           permanent: true },

      // Migrate: /migrate/<from> -> /migrate-from-<from>
      { source: "/migrate/supabase",    destination: "/migrate-from-supabase",    permanent: true },
      { source: "/migrate/railway",     destination: "/migrate-from-railway",     permanent: true },
      { source: "/migrate/heroku",      destination: "/migrate-from-heroku",      permanent: true },
      { source: "/migrate/planetscale", destination: "/migrate-from-planetscale", permanent: true },
    ];
  },
};
export default nextConfig;
