// ProductPage / MarketingPage - generic template shared by product, tool,
// comparison, and migration pages. Builds a hero, optional eyebrow, feature
// grid, code/visual section, and CTA from a typed config so individual
// route files stay short and consistent.

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "./icons";
import { Section, SectionHead, FeatureCard, CTASection } from "./sections";
import { FaqJsonLd, BreadcrumbJsonLd, SITE_URL } from "./jsonld";
import { authTarget, isEarlyAccessMode } from "@/lib/early-access";

export type ProductHero = {
  eyebrow?: string;
  title: ReactNode;
  subtitle: ReactNode;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  trust?: string[];
  visual?: ReactNode;
};

export type ProductFeature = {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  href?: string;
};

export type ProductSection = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  body?: ReactNode;
  alt?: boolean;
};

export function ProductHeroBlock({ hero }: { hero: ProductHero }) {
  const marketingHref = (href: string) =>
    isEarlyAccessMode() && (href.startsWith("/signup") || href.startsWith("/login"))
      ? authTarget("/signup")
      : href;
  return (
    <section className="m-hero">
      <div className="m-hero-grid-bg" aria-hidden />
      <div className="m-container m-hero-inner">
        {hero.eyebrow && (
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />{hero.eyebrow}</div>
        )}
        <h1>{hero.title}</h1>
        <p className="m-hero-lead">{hero.subtitle}</p>
        <div className="m-hero-ctas">
          {hero.primary && (
            <Link href={marketingHref(hero.primary.href)} className="m-btn m-btn-primary m-btn-lg">
              {hero.primary.label} <ArrowRightIcon size={16} />
            </Link>
          )}
          {hero.secondary && (
            <Link href={marketingHref(hero.secondary.href)} className="m-btn m-btn-secondary m-btn-lg">
              {hero.secondary.label}
            </Link>
          )}
        </div>
        {hero.trust && hero.trust.length > 0 && (
          <div className="m-hero-trust">
            {hero.trust.map((t, i) => (
              <span key={i} className="m-hero-trust-item">
                <span className="m-eyebrow-dot" /> {t}
              </span>
            ))}
          </div>
        )}
        {hero.visual && <div className="m-hero-visual">{hero.visual}</div>}
      </div>
    </section>
  );
}

export function FeatureGrid({
  features,
  columns = 3,
}: {
  features: ProductFeature[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={`m-grid m-grid-${columns}`}>
      {features.map((f, i) => (
        <FeatureCard key={i} icon={f.icon} title={f.title} body={f.body} href={f.href} />
      ))}
    </div>
  );
}

/** Two-column "marketing prose + side rail" section used for tool/migration walkthroughs. */
export function ProseSection({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  body: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Section>
      <div style={{ display: "grid", gridTemplateColumns: aside ? "1.4fr 1fr" : "1fr", gap: 36, alignItems: "start" }}>
        <div>
          {eyebrow && <div className="m-eyebrow m-mb-4"><span className="m-eyebrow-dot" />{eyebrow}</div>}
          <h2 style={{ marginBottom: 16 }}>{title}</h2>
          <div className="m-prose" style={{ maxWidth: "none", margin: 0 }}>{body}</div>
        </div>
        {aside && <div>{aside}</div>}
      </div>
    </Section>
  );
}

export function StepsBlock({
  steps,
}: {
  steps: { title: string; body: ReactNode }[];
}) {
  return (
    <div className="m-grid m-grid-2">
      {steps.map((s, i) => (
        <div key={i} className="m-card">
          <div className="m-row m-row-tight" style={{ color: "var(--m-text-brand)", fontWeight: 700 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 9,
              background: "var(--m-gradient-cta)", color: "white",
              display: "inline-grid", placeItems: "center",
              fontSize: 13, fontWeight: 800,
              boxShadow: "0 6px 16px color-mix(in srgb, var(--gradientcolor1) 34%, transparent)",
            }}>{i + 1}</span>
            <span style={{ fontSize: 15, fontWeight: 680, color: "var(--m-text-strong)" }}>{s.title}</span>
          </div>
          <div className="m-mt-3" style={{ color: "var(--m-text-2)", fontSize: 14.5, lineHeight: 1.6 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

export function ProductPage({
  hero,
  sections,
  faq,
  cta,
  breadcrumbs,
}: {
  hero: ProductHero;
  sections: ReactNode;
  faq?: { q: string; a: string }[];
  cta?: { title: ReactNode; subtitle?: ReactNode; primary?: { label: string; href: string }; secondary?: { label: string; href: string } };
  breadcrumbs?: { name: string; url: string }[];
}) {
  return (
    <>
      <ProductHeroBlock hero={hero} />
      {sections}
      {faq && faq.length > 0 && (
        <Section alt>
          <SectionHead title="Common questions" />
          <div className="m-faq-list" style={{ maxWidth: 820, margin: "0 auto" }}>
            {faq.map((it, i) => (
              <details key={i} className="m-faq-item">
                <summary>{it.q}</summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
          <FaqJsonLd items={faq} />
        </Section>
      )}
      <CTASection
        title={cta?.title ?? "Ready to deploy?"}
        subtitle={cta?.subtitle ?? "Two minutes to sign up. 47 seconds to deploy."}
        primary={cta?.primary}
        secondary={cta?.secondary}
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbJsonLd
          items={breadcrumbs.map((b) => ({ name: b.name, url: `${SITE_URL}${b.url}` }))}
        />
      )}
    </>
  );
}
