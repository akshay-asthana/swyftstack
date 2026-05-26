// /refund — Refund Policy. Kept short and concrete: refunds happen, here
// are the rules.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal-shell";
import { SITE_URL } from "@/components/marketing/jsonld";

const DESCRIPTION = "Swyftstack Refund Policy — when we refund, when we don't, and how to ask. 30-day full refund on the first month of any paid plan if Swyftstack isn't right for you.";

export const metadata: Metadata = {
  title: "Refund Policy — Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/refund` },
  openGraph: { title: "Swyftstack Refund Policy", description: DESCRIPTION, url: `${SITE_URL}/refund`, type: "article" },
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refund Policy"
      effective="2026-05-26"
      intro={<>If Swyftstack isn&rsquo;t right for you, we&rsquo;ll refund you. No friction, no &ldquo;retention specialist&rdquo;. Email <a href="mailto:billing@swyftstack.com">billing@swyftstack.com</a> with your account email and a refund request and we&rsquo;ll process it.</>}
    >
      <h2>1. 30-day no-questions refund</h2>
      <p>
        Within 30 days of your first paid invoice on any plan, you can request a full refund — no questions asked. We&rsquo;ll refund the first month&rsquo;s charge in full and close the account.
      </p>

      <h2>2. Pro-rated refunds outside the 30 days</h2>
      <p>
        After the first 30 days, monthly plans are non-refundable for the current billing cycle. We will not pro-rate the remaining days of the cycle. You can cancel at any time and the plan will not auto-renew at the next cycle.
      </p>

      <h2>3. Annual plans</h2>
      <p>
        Annual plans (Pro / Enterprise paid in advance) are pro-rated on cancellation: we refund the unused full months minus the difference between the annual rate and the monthly rate for the months you used.
      </p>

      <h2>4. Overage charges</h2>
      <p>
        Storage and egress overage charges, billed in arrears, are not refundable once incurred — they reflect actual resource use. If you believe an overage charge is incorrect (e.g. a metering bug), email <a href="mailto:billing@swyftstack.com">billing@swyftstack.com</a> and we&rsquo;ll investigate.
      </p>

      <h2>5. Outages and SLA credits</h2>
      <p>
        If we miss the 99.9% monthly uptime target on the Pro or Enterprise plan, you are entitled to SLA credits as set out in your order form or in the Terms. SLA credits are applied to your next invoice rather than paid out in cash.
      </p>

      <h2>6. Disputed charges</h2>
      <p>
        Please contact us before disputing a charge with your card issuer — chargebacks cost everybody time and money. We respond to billing emails within one working day. <a href="mailto:billing@swyftstack.com">billing@swyftstack.com</a>.
      </p>

      <h2>7. How to request a refund</h2>
      <ol>
        <li>Email <a href="mailto:billing@swyftstack.com">billing@swyftstack.com</a> from the email on the account.</li>
        <li>Include the invoice ID or order date.</li>
        <li>We respond within 1 working day and the refund settles to the original payment method within 5&ndash;10 business days.</li>
      </ol>

      <p>
        See also our <Link href="/terms">Terms of Service</Link> for the underlying contract.
      </p>
    </LegalShell>
  );
}
