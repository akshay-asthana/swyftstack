// MarketingFooter - detailed multi-column footer matched to the new mega
// menu architecture. Static server component; zero JS shipped. Links use
// SEO-friendly slugs (no /for/* or /vs/* prefixes).
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="m-footer" role="contentinfo">
      <div className="m-container">
        <div className="m-footer-grid">
          <div className="m-footer-brand">
            <Link className="m-brand" href="/">
              <span className="m-brand-mark">S</span>
              <span>Swyftstack</span>
            </Link>
            <p>
              Production-ready database and storage for your apps - in seconds.
              Managed PostgreSQL, S3 storage, backups and migrations on one
              premium developer platform.
            </p>
          </div>

          <div className="m-footer-col">
            <div className="m-footer-col-title">Products</div>
            <Link href="/postgres">Managed PostgreSQL</Link>
            <Link href="/storage">Object storage</Link>
            <Link href="/static-sites">Static site hosting</Link>
            <Link href="/migrate">Migration hub</Link>
            <Link href="/platform">Platform overview</Link>
          </div>

          <div className="m-footer-col">
            <div className="m-footer-col-title">Solutions</div>
            <Link href="/backend-for-vibe-coded-apps">AI-built apps</Link>
            <Link href="/nextjs-database">Next.js database</Link>
            <Link href="/django-database">Django database</Link>
            <Link href="/laravel-database">Laravel database</Link>
            <Link href="/nodejs-database">Node.js database</Link>
          </div>

          <div className="m-footer-col">
            <div className="m-footer-col-title">Compare</div>
            <Link href="/supabase-alternative">Supabase alternative</Link>
            <Link href="/railway-alternative">Railway alternative</Link>
            <Link href="/heroku-postgres-alternative">Heroku Postgres alternative</Link>
            <Link href="/render-alternative">Render alternative</Link>
            <Link href="/migrate">Migrate to Swyftstack</Link>
          </div>

          <div className="m-footer-col">
            <div className="m-footer-col-title">Company</div>
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/announcements">Announcements</Link>
            <Link href="/security">Security & trust</Link>
          </div>
        </div>

        <div className="m-footer-bottom">
          <span>© {new Date().getFullYear()} Swyftstack. All rights reserved.</span>
          <div className="m-footer-bottom-links">
            <Link href="/security">Status</Link>
            <Link href="/about">About</Link>
            <Link href="/console">Console</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
