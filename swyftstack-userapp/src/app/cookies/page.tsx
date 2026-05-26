// /cookies — Cookie Policy. We use the minimum set of cookies we can. This
// page enumerates them so we don't owe a consent banner for tracking.
import type { Metadata } from "next";
import { LegalShell } from "@/components/marketing/legal-shell";
import { SITE_URL } from "@/components/marketing/jsonld";

const DESCRIPTION = "Swyftstack Cookie Policy — every cookie we set, why we set it, and how long it lives. No third-party advertising trackers, no fingerprinting.";

export const metadata: Metadata = {
  title: "Cookie Policy — Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/cookies` },
  openGraph: { title: "Swyftstack Cookie Policy", description: DESCRIPTION, url: `${SITE_URL}/cookies`, type: "article" },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookie Policy"
      effective="2026-05-26"
      intro={<>We use the minimum set of cookies a working dashboard needs. No third-party advertising trackers, no fingerprinting scripts, no &ldquo;analytics&rdquo; cookies that share data with vendors.</>}
    >
      <h2>What is a cookie</h2>
      <p>
        A cookie is a small text file your browser stores when you visit a website. Some are essential (signing you in); some are optional (preferences). We only use the essential ones.
      </p>

      <h2>Cookies we set</h2>
      <div className="m-card" style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--m-surface-2)" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Name</th>
              <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Purpose</th>
              <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}><code>session</code></td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Keeps you signed in to the customer dashboard.</td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>14 days, sliding</td></tr>
            <tr><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}><code>csrf</code></td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Prevents cross-site request forgery on form submissions.</td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Session-only</td></tr>
            <tr><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}><code>swyftstack:console-theme</code></td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Remembers your light/dark preference. Stored as localStorage, not a server-side cookie.</td><td style={{ padding: "12px 16px", borderBottom: "1px solid var(--m-border)" }}>Until cleared</td></tr>
            <tr><td style={{ padding: "12px 16px" }}><code>swyftstack:m-theme</code></td><td style={{ padding: "12px 16px" }}>Same preference for the public marketing site.</td><td style={{ padding: "12px 16px" }}>Until cleared</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Third-party cookies</h2>
      <p>
        We don&rsquo;t set third-party cookies on the marketing site. Inside the customer dashboard, our payment processor (Stripe) sets cookies for fraud detection when you reach the billing page — these are governed by Stripe&rsquo;s own privacy and cookie policies.
      </p>

      <h2>Controlling cookies</h2>
      <p>
        Most browsers let you block or delete cookies via the settings menu. Blocking the <code>session</code> cookie will sign you out of the dashboard.
      </p>
    </LegalShell>
  );
}
