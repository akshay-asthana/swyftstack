// MarketingTemplate — shared layout primitive for the bulk-generated SEO
// pages (alternatives, solutions, AI-tool, migrate-from). Each page passes
// in its specific content and the template handles the shell, hero,
// metadata structured-data slot, FAQ rendering, and final CTA so individual
// page files stay short and consistent.
//
// Why a template instead of bespoke layouts: there are ~15 SEO pages with
// the same five-section shape (hero → "when X / when us" → comparison or
// steps → snippets → FAQ → CTA). A template keeps every page on-brand and
// makes copy edits a one-line change.

import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingShell } from "./shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard } from "./sections";
import { HeroBackgroundAnimation } from "./hero-background";
import { ComparisonTable, type ComparisonColumn, type ComparisonRow } from "./comparison-table";
import { CodeSnippet, type Snippet } from "./code-snippet";
import { FaqJsonLd } from "./jsonld";
import { ArrowRightIcon } from "./icons";

export type WhenList = { title: string; items: string[] };

export type StepItem = { n: number; title: string; body: string };

export type Faq = { q: string; a: string };

export type MarketingTemplateProps = {
  /** Pill above the H1. */
  eyebrow: string;
  /** Hero H1 — keep short, gradient styling will wrap the optional `headlineAccent`. */
  headline: string;
  /** The accent fragment (gets the gradient). Optional. */
  headlineAccent?: string;
  /** Sub-headline (max 2 lines). */
  subheadline: string;
  /** Primary CTA. */
  primaryCta?: { label: string; href: string };
  /** Secondary CTA. */
  secondaryCta?: { label: string; href: string };

  /** Optional "When [competitor] is the right choice / When we are" two-column. */
  whenLists?: { left: WhenList; right: WhenList };

  /** Optional comparison table. */
  comparison?: { columns: ComparisonColumn[]; rows: ComparisonRow[]; title?: string; eyebrow?: string; subtitle?: string };

  /** Optional numbered step list (used by migrate-from pages). */
  steps?: { eyebrow?: string; title?: string; subtitle?: string; items: StepItem[] };

  /** Optional code snippets section. */
  snippets?: { eyebrow?: string; title?: string; subtitle?: string; snippets: Snippet[] };

  /** Optional "what migrates / what you handle separately" feature lists. */
  bullets?: { title: string; eyebrow?: string; subtitle?: string; items: { icon?: ReactNode; title: string; body: string }[] };

  /** Optional FAQ list (also emitted as FAQPage JSON-LD). */
  faq?: { title?: string; items: Faq[] };

  /** Final CTA block. */
  finalCta: { title: string; subtitle?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string } };

  /** Slot for any extra structured data (BreadcrumbList, etc.). */
  jsonLd?: ReactNode;

  /** Extra body content rendered between snippets and FAQ. */
  children?: ReactNode;
};

export function MarketingTemplate(p: MarketingTemplateProps) {
  return (
    <MarketingShell>
      {p.jsonLd}
      {p.faq && <FaqJsonLd items={p.faq.items} />}

      {/* ─────────── Hero ─────────── */}
      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />{p.eyebrow}</div>
          <h1>
            {p.headlineAccent ? (
              <>
                {p.headline}{" "}
                <span className="m-text-grad">{p.headlineAccent}</span>
              </>
            ) : p.headline}
          </h1>
          <p className="m-hero-lead">{p.subheadline}</p>
          {(p.primaryCta || p.secondaryCta) && (
            <div className="m-hero-ctas">
              {p.primaryCta && (
                <Link className="m-btn m-btn-primary m-btn-lg" href={p.primaryCta.href}>
                  {p.primaryCta.label} <ArrowRightIcon size={16} />
                </Link>
              )}
              {p.secondaryCta && (
                <Link className="m-btn m-btn-secondary m-btn-lg" href={p.secondaryCta.href}>
                  {p.secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── When / when ─────────── */}
      {p.whenLists && (
        <Section borderTop>
          <div className="m-grid m-grid-2">
            <WhenCard list={p.whenLists.left} tone="muted" />
            <WhenCard list={p.whenLists.right} tone="brand" />
          </div>
        </Section>
      )}

      {/* ─────────── Comparison table ─────────── */}
      {p.comparison && (
        <Section alt>
          <SectionHead
            eyebrow={p.comparison.eyebrow ?? "Side-by-side"}
            title={p.comparison.title ?? "Honest comparison"}
            subtitle={p.comparison.subtitle}
          />
          <ComparisonTable columns={p.comparison.columns} rows={p.comparison.rows} />
        </Section>
      )}

      {/* ─────────── Steps ─────────── */}
      {p.steps && (
        <Section>
          <SectionHead
            eyebrow={p.steps.eyebrow ?? "How it works"}
            title={p.steps.title ?? "The whole flow"}
            subtitle={p.steps.subtitle}
          />
          <div className="m-grid m-grid-2">
            {p.steps.items.map((s) => (
              <div key={s.n} className="m-card">
                <div className="m-row m-row-tight">
                  <span style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: "var(--m-gradient-cta)", color: "white",
                    display: "inline-grid", placeItems: "center",
                    fontWeight: 800, fontSize: 13,
                    boxShadow: "0 6px 16px rgba(109,94,246,.4)",
                  }}>{s.n}</span>
                  <span style={{ fontWeight: 680, color: "var(--m-text-strong)", fontSize: 15 }}>{s.title}</span>
                </div>
                <p className="m-feature-body m-mt-3">{s.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─────────── Snippets ─────────── */}
      {p.snippets && (
        <Section alt>
          <SectionHead
            eyebrow={p.snippets.eyebrow ?? "Code"}
            title={p.snippets.title ?? "Wire it up"}
            subtitle={p.snippets.subtitle}
          />
          <CodeSnippet snippets={p.snippets.snippets} />
        </Section>
      )}

      {/* ─────────── Bullets ─────────── */}
      {p.bullets && (
        <Section>
          <SectionHead
            eyebrow={p.bullets.eyebrow}
            title={p.bullets.title}
            subtitle={p.bullets.subtitle}
          />
          <div className="m-grid m-grid-3">
            {p.bullets.items.map((b, i) => (
              <FeatureCard key={i} icon={b.icon ?? <span /> } title={b.title} body={b.body} />
            ))}
          </div>
        </Section>
      )}

      {p.children}

      {p.faq && <FAQSection title={p.faq.title ?? "Frequently asked"} items={p.faq.items} />}

      <CTASection
        title={p.finalCta.title}
        subtitle={p.finalCta.subtitle}
        primary={p.finalCta.primary}
        secondary={p.finalCta.secondary}
      />
    </MarketingShell>
  );
}

function WhenCard({ list, tone }: { list: WhenList; tone: "muted" | "brand" }) {
  return (
    <div className={`m-card ${tone === "brand" ? "m-card-glow" : ""}`}>
      <h3 style={{ fontSize: 19, marginBottom: 8 }}>{list.title}</h3>
      <ul className="m-plan-list m-mt-3">
        {list.items.map((it, i) => (
          <li key={i}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: tone === "brand" ? "var(--m-text-brand)" : "var(--m-text-muted)" }}><path d="M5 12l5 5L20 7" /></svg>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
