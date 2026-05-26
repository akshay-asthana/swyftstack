// /terms — Terms of Service. The shell + table of contents layout is
// shared with the other policy pages via LegalShell. Copy is intentionally
// plain-English. We will negotiate enterprise MSAs separately on request,
// but every Starter/Growth/Pro signup is bound by this page.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal-shell";
import { SITE_URL } from "@/components/marketing/jsonld";

const DESCRIPTION = "Terms of Service for Swyftstack — what you agree to when you sign up for a Swyftstack account, what we promise in return, and how either side can end the relationship.";

export const metadata: Metadata = {
  title: "Terms of Service — Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: { title: "Swyftstack Terms of Service", description: DESCRIPTION, url: `${SITE_URL}/terms`, type: "article" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      effective="2026-05-26"
      intro={<>The contract between you and Swyftstack. By creating an account, you agree to these terms. We try to keep this page short and in plain English; if anything is unclear, email <a href="mailto:legal@swyftstack.com">legal@swyftstack.com</a> and we&rsquo;ll explain.</>}
    >
      <h2>1. Who this applies to</h2>
      <p>
        These Terms govern your use of the Swyftstack platform at <Link href="/">swyftstack.com</Link>, including managed PostgreSQL, S3-compatible object storage, backups, migrations, and the customer dashboard (collectively, the &ldquo;Service&rdquo;). &ldquo;Swyftstack&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; refer to the company operating the Service. &ldquo;You&rdquo; refers to the individual or organisation that signed up.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 18 years old and able to enter a binding contract. You are responsible for keeping your credentials safe and for everything done under your account. Tell us immediately if you suspect unauthorised access by emailing <a href="mailto:security@swyftstack.com">security@swyftstack.com</a>.
      </p>

      <h2>3. What you can do with the Service</h2>
      <p>
        Subject to these Terms and your active subscription, you may use the Service for your own applications and workloads. You may transfer data into and out of the Service freely — pg_dump and S3 export are first-class on every plan.
      </p>

      <h2>4. What you cannot do</h2>
      <ul>
        <li>Run workloads that violate our <Link href="/acceptable-use">Acceptable Use Policy</Link> (illegal content, abuse, spam, crypto-mining, etc.).</li>
        <li>Resell, sublicense, or white-label the Service without a written agreement with us.</li>
        <li>Reverse engineer the Service or use it to build a competing product.</li>
        <li>Bypass usage limits or access methods (e.g. via shared credentials between unrelated organisations).</li>
      </ul>

      <h2>5. Plans, billing, and changes</h2>
      <p>
        Pricing for current plans is published at <Link href="/pricing">/pricing</Link>. Plans are billed monthly in advance. Overage rates (storage, egress, etc.) are published next to the plan and billed in arrears at the end of each cycle. We may change pricing with at least 30 days&rsquo; notice via the email on your account; the new price takes effect on your next renewal.
      </p>

      <h2>6. Refunds and cancellation</h2>
      <p>
        You can cancel at any time from the customer dashboard. Refund eligibility is governed by the <Link href="/refund">Refund Policy</Link>. After cancellation we retain your data for 30 days so a re-activation does not lose state; after that we delete it. You can export everything at any time via the dashboard or by emailing support.
      </p>

      <h2>7. Data ownership and privacy</h2>
      <p>
        You own the data you store on the Service. We never sell it, never train models on it, and only access it when you ask us to (e.g. for a support case) or where strictly necessary to operate the platform. Details of what we collect and how we use it are in the <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Service availability</h2>
      <p>
        We commit to a 99.9% monthly uptime target on the Service. Specific SLA credits apply on the Pro and Enterprise plans and are documented in your order form or our security page. Scheduled maintenance is announced at least 48 hours in advance via the customer dashboard and email.
      </p>

      <h2>9. Security</h2>
      <p>
        We encrypt data in transit (TLS 1.2+) and at rest (AES-256). Daily backups are encrypted with separate keys and tested via weekly restore drills. Our security posture is documented at <Link href="/security">/security</Link>.
      </p>

      <h2>10. Termination</h2>
      <p>
        You can cancel anytime. We may suspend or terminate your account if you violate these Terms or the Acceptable Use Policy, if your payment fails for more than 7 days, or if we are required to do so by law. We will give you reasonable notice and an opportunity to fix the issue when we can.
      </p>

      <h2>11. Disclaimers and liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind, except as required by applicable consumer law. To the maximum extent permitted by law, our aggregate liability for any claim arising out of these Terms is limited to the fees you paid us in the 12 months before the claim. We are not liable for indirect, consequential, or punitive damages.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to indemnify Swyftstack against claims arising from your use of the Service in violation of these Terms or applicable law, including content you upload, store, or transmit through the Service.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, without regard to conflict-of-laws principles. Disputes will be resolved exclusively in the courts of Bengaluru, India, unless required otherwise by mandatory consumer-protection law in your jurisdiction.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced via email at least 30 days before they take effect, and your continued use of the Service after that date constitutes acceptance. The current version is always at this URL with the &ldquo;Last updated&rdquo; date at the top.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions, notices, or termination requests: <a href="mailto:legal@swyftstack.com">legal@swyftstack.com</a>.
      </p>
    </LegalShell>
  );
}
