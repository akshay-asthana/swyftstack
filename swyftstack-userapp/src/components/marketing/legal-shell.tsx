// Server-side wrapper shared by every legal/policy page. Each page passes a
// title, an effective date, and prose children; the shell handles the hero,
// the table-of-contents-friendly prose container, the canonical-link
// metadata helper, and the "still got questions?" CTA at the foot.
//
// Why one shell instead of bespoke layouts: legal pages drift fast when
// they're copy-pasted. Centralising the shell means a layout fix lands on
// every policy at once.
import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingShell } from "./shell";
import { Section } from "./sections";

export function LegalShell({
  title,
  intro,
  effective,
  children,
}: {
  title: string;
  intro?: ReactNode;
  /** ISO date or human-readable string for the "Last updated" line. */
  effective: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <section className="m-hero" style={{ paddingBottom: 32 }}>
        <div className="m-container m-hero-inner" style={{ textAlign: "left" }}>
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Legal</div>
          <h1 style={{ textAlign: "left" }}>{title}</h1>
          <p
            className="m-hero-lead"
            style={{ textAlign: "left", margin: 0 }}
          >
            {intro}
          </p>
          <p style={{ marginTop: 14, color: "var(--m-text-muted)", fontSize: 13 }}>
            Last updated: <strong>{effective}</strong>
          </p>
        </div>
      </section>

      <Section tight>
        <div className="m-container-prose m-prose" style={{ marginInline: "auto" }}>
          {children}
          <hr style={{ border: 0, borderTop: "1px solid var(--m-border)", margin: "32px 0" }} />
          <p style={{ color: "var(--m-text-muted)", fontSize: 13 }}>
            Questions about this policy? Email{" "}
            <a href="mailto:legal@swyftstack.com">legal@swyftstack.com</a> and a
            human will reply. For product support email{" "}
            <a href="mailto:support@swyftstack.com">support@swyftstack.com</a>.
            See also our{" "}
            <Link href="/terms">Terms of Service</Link>,{" "}
            <Link href="/privacy">Privacy Policy</Link>,{" "}
            <Link href="/cookies">Cookie Policy</Link>,{" "}
            <Link href="/refund">Refund Policy</Link>, and{" "}
            <Link href="/acceptable-use">Acceptable Use Policy</Link>.
          </p>
        </div>
      </Section>
    </MarketingShell>
  );
}
