// Public marketing shell. Header + footer + simple layout. Zero imports
// from admin/console — safe to render for unauthenticated visitors.
import Link from "next/link";
import { currentUser } from "@/lib/auth";

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="mk">
      <header className="mk-header">
        <div className="mk-container row between">
          <Link className="mk-brand" href="/">
            <span className="mk-brand-mark">S</span>
            <span>Swyftstack</span>
          </Link>
          <nav className="mk-nav">
            <Link href="/platform">Platform</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/announcements">News</Link>
          </nav>
          <div className="row" style={{ gap: 10 }}>
            {user ? (
              <Link className="btn" href="/console">Open console</Link>
            ) : (
              <>
                <Link className="small" href="/login">Sign in</Link>
                <Link className="btn" href="/signup">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mk-main">{children}</main>
      <footer className="mk-footer">
        <div className="mk-container">
          <div className="mk-footer-grid">
            <div>
              <div className="mk-brand"><span className="mk-brand-mark">S</span> Swyftstack</div>
              <p className="small muted" style={{ marginTop: 8, maxWidth: 320 }}>
                Databases, object storage, and app hosting on one platform.
              </p>
            </div>
            <div>
              <div className="mk-foot-title">Product</div>
              <Link href="/platform">Platform</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/console">Console</Link>
            </div>
            <div>
              <div className="mk-foot-title">Company</div>
              <Link href="/blog">Blog</Link>
              <Link href="/announcements">News</Link>
              <Link href="/help">Docs</Link>
            </div>
            <div>
              <div className="mk-foot-title">Account</div>
              {user ? (
                <Link href="/console">Open console</Link>
              ) : (
                <>
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Sign up</Link>
                </>
              )}
            </div>
          </div>
          <div className="mk-foot-bottom">© {new Date().getFullYear()} Swyftstack</div>
        </div>
      </footer>
    </div>
  );
}
