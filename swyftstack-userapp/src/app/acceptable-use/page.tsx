// /acceptable-use — Acceptable Use Policy. Sets the line we expect every
// customer to stay above.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal-shell";
import { SITE_URL } from "@/components/marketing/jsonld";

const DESCRIPTION = "Swyftstack Acceptable Use Policy — what you can't host on the platform, how we handle abuse reports, and what happens when an account is found in violation.";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/acceptable-use` },
  openGraph: { title: "Swyftstack Acceptable Use Policy", description: DESCRIPTION, url: `${SITE_URL}/acceptable-use`, type: "article" },
  robots: { index: true, follow: true },
};

export default function AcceptableUsePage() {
  return (
    <LegalShell
      title="Acceptable Use Policy"
      effective="2026-05-26"
      intro={<>Swyftstack is a general-purpose database and storage platform. We trust customers to use it sensibly — but a small set of activities are not permitted under any circumstances.</>}
    >
      <h2>Prohibited content and activity</h2>
      <ul>
        <li><strong>Illegal content:</strong> child sexual abuse material, content that violates applicable export controls, or anything illegal under the law of the customer&rsquo;s jurisdiction or India.</li>
        <li><strong>Spam and abusive automation:</strong> using the platform to send unsolicited bulk email, SMS, push notifications, or to power scrapers that violate other services&rsquo; terms.</li>
        <li><strong>Phishing or impersonation:</strong> hosting login pages or branding intended to impersonate another company.</li>
        <li><strong>Malware distribution:</strong> hosting or serving malicious binaries, command-and-control endpoints, or exploit-kit payloads.</li>
        <li><strong>Cryptocurrency mining:</strong> running miners (CPU, GPU, or otherwise) on Swyftstack-managed compute or using buckets as a substrate for blockchain data services.</li>
        <li><strong>Denial-of-service:</strong> using Swyftstack endpoints as part of a DDoS attack against any target, including the platform itself.</li>
        <li><strong>Security testing without authorisation:</strong> penetration testing against Swyftstack infrastructure or any third party from a Swyftstack account. To test your own application running on Swyftstack, email <a href="mailto:security@swyftstack.com">security@swyftstack.com</a> first — we&rsquo;ll usually say yes.</li>
        <li><strong>Resource abuse:</strong> deliberately circumventing plan quotas, sharing credentials across organisations to avoid limits, or running workloads designed to exploit free-tier or trial usage.</li>
      </ul>

      <h2>Reporting abuse</h2>
      <p>
        Email <a href="mailto:abuse@swyftstack.com">abuse@swyftstack.com</a> with the URL, IP, or bucket name involved and a description of the issue. We acknowledge reports within one working day and act on confirmed abuse within five business days.
      </p>

      <h2>What happens on a violation</h2>
      <p>
        For low-severity issues we contact the account owner first and give them a chance to fix the issue. For high-severity issues (CSAM, active phishing, ongoing DDoS) we suspend the affected resource immediately and notify the account owner.
      </p>

      <p>
        Repeated or material violations result in termination of the account under the <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}
