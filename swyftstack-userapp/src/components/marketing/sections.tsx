// Marketing section primitives - wraps content with consistent spacing
// and optional eyebrow/heading. Server components, zero JS shipped.
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, CheckIcon } from "./icons";

export function Section({
  alt,
  grad,
  borderTop,
  tight,
  id,
  children,
}: {
  alt?: boolean;
  grad?: boolean;
  borderTop?: boolean;
  tight?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const cls = [
    "m-section",
    tight ? "m-section-tight" : "",
    alt ? "m-section-alt" : "",
    grad ? "m-section-grad" : "",
    borderTop ? "m-section-border-top" : "",
  ].filter(Boolean).join(" ");
  return (
    <section className={cls} id={id}>
      <div className="m-container">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={`m-section-head ${align === "left" ? "m-section-head-left" : ""}`}>
      {eyebrow && (
        <div className="m-eyebrow" style={{ marginBottom: 18 }}>
          <span className="m-eyebrow-dot" />
          {eyebrow}
        </div>
      )}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  body,
  href,
  cta = "Learn more",
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  href?: string;
  cta?: string;
}) {
  const content = (
    <>
      <div className="m-feature-icon">{icon}</div>
      <div className="m-feature-title">{title}</div>
      <p className="m-feature-body">{body}</p>
      {href && (
        <div className="m-mt-4" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--m-text-brand)", fontWeight: 600, fontSize: 13.5 }}>
          {cta} <ArrowRightIcon size={14} />
        </div>
      )}
    </>
  );
  return href
    ? <Link href={href} className="m-feature" style={{ display: "block", color: "inherit" }}>{content}</Link>
    : <div className="m-feature">{content}</div>;
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="m-plan-list" style={{ marginTop: 0 }}>
      {items.map((it, i) => (
        <li key={i}><CheckIcon size={16} /> <span>{it}</span></li>
      ))}
    </ul>
  );
}

export function CTASection({
  title,
  subtitle,
  primary,
  secondary,
  signedIn,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  signedIn?: boolean;
}) {
  const pri = primary ?? (signedIn
    ? { label: "Open console", href: "/console" }
    : { label: "Deploy your first database", href: "/signup" });
  const sec = secondary ?? { label: "See pricing", href: "/pricing" };
  return (
    <section className="m-cta-section">
      <div className="m-container">
        <div className="m-cta">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          <div className="m-cta-row">
            <Link href={pri.href} className="m-btn m-btn-primary m-btn-lg">
              {pri.label} <ArrowRightIcon size={16} />
            </Link>
            <Link href={sec.href} className="m-btn m-btn-secondary m-btn-lg">{sec.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FAQSection({
  title = "Frequently asked questions",
  items,
}: {
  title?: string;
  items: { q: string; a: ReactNode }[];
}) {
  return (
    <Section>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <SectionHead title={title} />
        <div className="m-faq-list">
          {items.map((it, i) => (
            <details key={i} className="m-faq-item">
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function HeroEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="m-eyebrow">
      <span className="m-eyebrow-dot" />
      {children}
    </div>
  );
}
