// /privacy — Privacy Policy. Mirrors the shared LegalShell layout.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal-shell";
import { SITE_URL } from "@/components/marketing/jsonld";

const DESCRIPTION = "Swyftstack Privacy Policy — what we collect, why we collect it, and the rights you have over your data. We never sell your data and never train AI models on customer content.";

export const metadata: Metadata = {
  title: "Privacy Policy — Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: { title: "Swyftstack Privacy Policy", description: DESCRIPTION, url: `${SITE_URL}/privacy`, type: "article" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      effective="2026-05-26"
      intro={<>Short version: you own your data. We don&rsquo;t sell it. We don&rsquo;t train models on it. We only access it when you ask us to. The long version is below.</>}
    >
      <h2>1. Who we are</h2>
      <p>
        Swyftstack is operated by the company at the address listed on our <Link href="/about">About</Link> page. We are the data controller for the personal data described below.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, organisation, password hash (bcrypt or argon2), and the auth provider you used.</li>
        <li><strong>Billing data:</strong> billing address, last 4 digits of the card, invoice history. Card details are stored by our payment processor, never by us.</li>
        <li><strong>Usage telemetry:</strong> request counts, storage and egress totals, error rates per project. Used to bill correctly and to debug issues you report.</li>
        <li><strong>Server logs:</strong> IP, user agent, and request metadata for the dashboard. Retained 30 days, then aggregated.</li>
        <li><strong>Customer data:</strong> the rows in your database and the files in your buckets. We treat this as if it were our own — no humans look at it unless you ask us to (e.g. during a support session) or we are legally compelled.</li>
      </ul>

      <h2>3. Why we collect it</h2>
      <ul>
        <li>To run the service (provision databases, route requests, enforce quotas).</li>
        <li>To bill you correctly and pay applicable taxes.</li>
        <li>To answer support tickets and debug issues you report.</li>
        <li>To meet legal obligations (tax records, fraud prevention, lawful process).</li>
      </ul>

      <h2>4. What we don&rsquo;t do</h2>
      <ul>
        <li>We never sell personal data to anyone.</li>
        <li>We never train AI/ML models on customer database rows, bucket contents, or telemetry.</li>
        <li>We never read your data &ldquo;in the background&rdquo;. Access is logged and used only on your request or where strictly necessary to operate the platform (e.g. to investigate an abuse complaint we received).</li>
      </ul>

      <h2>5. Where data lives</h2>
      <p>
        Customer databases and buckets live in the region you select at signup (US-East, EU-West, or Asia-Pacific at launch). Backups are stored in the same region. Operational metadata (your account, billing, usage telemetry) lives in our control-plane database in the EU.
      </p>

      <h2>6. Sub-processors</h2>
      <p>
        We use a small number of vendors to run the service. The current list (Stripe for payments, Resend/Zeptomail for email, Cloudflare for DNS and CDN, the hyperscaler the chosen region maps to) is published at <Link href="/security">/security</Link>. We notify customers via email at least 30 days before adding a new sub-processor that handles customer data.
      </p>

      <h2>7. Your rights</h2>
      <p>
        If you are in the EEA, UK, California, or any jurisdiction with equivalent data-protection law, you have the right to access, correct, export, or delete the personal data we hold about you, and to object to or restrict certain processing. Email <a href="mailto:privacy@swyftstack.com">privacy@swyftstack.com</a> and we will respond within 30 days.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use a minimal set of strictly-necessary cookies (session, CSRF, theme preference) on the website and dashboard. We do not run third-party advertising trackers. See the <Link href="/cookies">Cookie Policy</Link> for the full list.
      </p>

      <h2>9. Retention</h2>
      <p>
        Customer data is retained while your account is active. After cancellation, we hold it for 30 days so a re-activation does not lose state; after that we delete it. Billing records are retained for the period required by tax law (typically 7 years). You can request earlier deletion of personal data at any time.
      </p>

      <h2>10. Security</h2>
      <p>
        TLS 1.2+ everywhere, AES-256 at rest, encrypted backups, scoped credentials, weekly restore drills, and an internal access log for the production database. Details at <Link href="/security">/security</Link>.
      </p>

      <h2>11. Contacting us</h2>
      <p>
        Privacy questions or data-subject requests: <a href="mailto:privacy@swyftstack.com">privacy@swyftstack.com</a>. Security issues: <a href="mailto:security@swyftstack.com">security@swyftstack.com</a>. We answer both within one working day.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        Material changes are announced via email at least 30 days in advance. The current version is always at this URL with the &ldquo;Last updated&rdquo; date.
      </p>
    </LegalShell>
  );
}
