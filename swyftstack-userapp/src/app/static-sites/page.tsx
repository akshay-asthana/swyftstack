// Static site deployment product page. Free tier - we want every customer to
// be able to host a marketing site, docs site, or one-pager on Swyftstack
// without picking a plan. Mirrors the structure of the other product pages
// (hero, specs, workflow, snippets, FAQ, CTA) so the marketing surface stays
// visually consistent. Content is intentionally generous because the user
// asked for fuller solution/product pages across the site.

import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard, CheckList } from "@/components/marketing/sections";
import { CodeSnippet } from "@/components/marketing/code-snippet";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import {
  ArrowRightIcon,
  BoltIcon,
  ClockIcon,
  CodeIcon,
  GlobeIcon,
  LockIcon,
  ShieldIcon,
  TerminalIcon,
} from "@/components/marketing/icons";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";
import { authTarget } from "@/lib/early-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Static site deployment - free, fast, HTTPS by default | Swyftstack",
  description:
    "Push a folder, get a CDN-fronted HTTPS URL in seconds. Free for every Swyftstack account - perfect for marketing sites, docs, portfolios, and landing pages.",
  alternates: { canonical: `${SITE_URL}/static-sites` },
  openGraph: {
    title: "Static site deployment - free | Swyftstack",
    description: "Deploy a static site in seconds. Free for every account.",
    url: `${SITE_URL}/static-sites`,
    type: "website",
    siteName: "Swyftstack",
  },
};

const FAQ = [
  {
    q: "Is static site hosting really free?",
    a: "Yes. Static site deployment is included with every Swyftstack account, including the free tier. You don't need to pick a plan or add a card to ship a site.",
  },
  {
    q: "What counts as a static site?",
    a: "Any folder of HTML/CSS/JS/images, plus the output of any static generator - Astro, Hugo, Eleventy, Jekyll, MkDocs, VitePress, Docusaurus, Next.js export, Nuxt generate, SvelteKit static adapter. If your build produces a folder of files, we host it.",
  },
  {
    q: "Do I get HTTPS by default?",
    a: "Yes, on every deploy. Certificates are issued automatically (Let's Encrypt) and renew without any action from you.",
  },
  {
    q: "Can I use a custom domain?",
    a: "Yes. Point a CNAME or A record at the URL we give you. The first custom domain per site is free; additional domains follow your plan's custom-domain quota.",
  },
  {
    q: "How fast is the CDN?",
    a: "Sites are served from a multi-region edge. Average TTFB is under 80ms globally for cache hits. Cache invalidation runs as part of every deploy.",
  },
  {
    q: "Is there a build limit on the free tier?",
    a: "Free static sites get 100 deploys/month and 100 GB egress/month. That covers virtually every solo or small-team marketing site. Paid plans raise both, and deploys never count against your database/storage quotas.",
  },
  {
    q: "Is there a CLI or GitHub integration?",
    a: "Not yet. Today, uploads go through the dashboard - drag the build output folder onto the upload area, and you're live. A CLI and a GitHub auto-deploy integration are on the near-term roadmap; subscribe to the changelog if you want to be pinged when they ship.",
  },
  {
    q: "What about SSR or API routes?",
    a: "Static hosting is for fully pre-rendered output. If you need server functions, deploy your app on a runtime that supports them (Vercel, your own Node host) and point its DATABASE_URL/storage endpoints back at Swyftstack - that's the most common pattern.",
  },
];

// We don't ship a CLI yet - the dashboard handles uploads via drag-and-drop
// and (on the roadmap) GitHub integration. Snippets below stick to framework
// build commands and config; no `swyftstack` CLI invocations.
const SNIPPETS = [
  {
    name: "Dashboard upload",
    language: "sh" as const,
    code: `# 1. In your project root, run your normal build:
npm run build

# 2. The build emits a folder (e.g. ./dist, ./out, ./public).
# 3. In the Swyftstack console -> Static sites -> New site,
#    drag that folder onto the upload area.
# 4. You get an HTTPS URL on swyftstack.app in seconds.`,
  },
  {
    name: "Astro",
    language: "ts" as const,
    code: `// astro.config.mjs - no special adapter required.
import { defineConfig } from "astro/config";
export default defineConfig({ output: "static" });

// then:
//   npm run build
//   # upload the ./dist folder from the Swyftstack console`,
  },
  {
    name: "Next.js export",
    language: "ts" as const,
    code: `// next.config.js - for fully static export.
module.exports = { output: "export" };

// then:
//   npm run build
//   # upload the ./out folder from the Swyftstack console`,
  },
  {
    name: "Hugo / Eleventy / Jekyll",
    language: "sh" as const,
    code: `# Any static generator works the same way -
# run the build, upload the output directory.

# Hugo:
hugo --minify
# upload ./public

# Eleventy:
npx @11ty/eleventy
# upload ./_site

# Jekyll:
bundle exec jekyll build
# upload ./_site`,
  },
];

export default function StaticSitesPage() {
  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ} />

      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Free with every account</div>
          <h1>Ship a static site in <span className="m-text-grad">under a minute</span>.</h1>
          <p className="m-hero-lead">
            Push a folder. We CDN-host it on HTTPS at a swyftstack.app URL. Add your own domain
            whenever you&apos;re ready. Free, forever, on every plan.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href={authTarget("/signup")}>
              Deploy your first site <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/pricing">
              See pricing
            </Link>
          </div>
          <div className="m-hero-trust">
            <span className="m-hero-trust-item"><ClockIcon size={14} /> Sub-60s deploys</span>
            <span className="m-hero-trust-item"><LockIcon size={14} /> HTTPS by default</span>
            <span className="m-hero-trust-item"><GlobeIcon size={14} /> Multi-region edge</span>
            <span className="m-hero-trust-item"><ShieldIcon size={14} /> Free on every plan</span>
          </div>
        </div>
      </section>

      {/* What you get */}
      <Section borderTop>
        <SectionHead
          eyebrow="What you get"
          title="A real CDN host, not a glorified file share"
          subtitle="Everything you'd expect from a modern static host - the boring parts done correctly, included in the free tier."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<GlobeIcon size={22} />} title="Global edge"
            body="Multi-region cache with average sub-80ms TTFB for cache hits. Automatic invalidation on every deploy." />
          <FeatureCard icon={<LockIcon size={22} />} title="HTTPS, no setup"
            body="Certificates issued and renewed automatically. HTTP/2 and HTTP/3 on every site, every deploy." />
          <FeatureCard icon={<BoltIcon size={22} />} title="Atomic deploys"
            body="Every push is a new immutable snapshot. Roll back to any previous deploy in one click." />
          <FeatureCard icon={<CodeIcon size={22} />} title="Custom domains"
            body="Add a CNAME or A record - the first domain per site is free, regardless of plan." />
          <FeatureCard icon={<ShieldIcon size={22} />} title="DDoS-tolerant"
            body="Edge soaks bursts; origin is never exposed. No tuning needed for a marketing site that goes viral." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="No framework lock-in"
            body="Bring any static generator. The dashboard accepts the output folder of Astro, Hugo, Next.js export, Nuxt generate, Eleventy, Jekyll, MkDocs - whatever your build emits." />
        </div>
      </Section>

      {/* Workflow */}
      <Section alt>
        <SectionHead
          eyebrow="Workflow"
          title="Build locally. Drag the folder in. You're live."
          subtitle="No project config, no platform-specific framework wrapper. If your build produces a folder, we can host it."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 36, alignItems: "start" }} className="m-section-grid-2">
          <CodeSnippet snippets={SNIPPETS} />
          <CheckList items={[
            "Works with Astro, Hugo, Eleventy, Jekyll, MkDocs, Docusaurus, VitePress.",
            "Works with Next.js, Nuxt, and SvelteKit when exported to static.",
            "Drag-and-drop upload from the Swyftstack console.",
            "Atomic deploys - every upload is a new immutable snapshot, rollback in one click.",
            "Custom domains for free on every site.",
            "GitHub integration for auto-deploy is on the roadmap.",
          ]} />
        </div>
      </Section>

      {/* Who it's for */}
      <Section>
        <SectionHead
          eyebrow="Built for"
          title="Marketing sites, docs, portfolios, MVP landing pages"
          subtitle="If you'd otherwise spin up Netlify, Vercel, or GitHub Pages for a static folder - put it here instead, and keep everything (site + database + storage) under one Swyftstack invoice."
        />
        <div className="m-grid m-grid-4">
          <UseCase title="Marketing sites" body="Hero + features + pricing + footer. Deploy from `main`, preview from PRs." />
          <UseCase title="Documentation" body="MkDocs, Docusaurus, Astro Starlight. Versioned docs that ship with your release." />
          <UseCase title="Portfolios" body="One-page resumes, design systems, agency sites. Custom domain included." />
          <UseCase title="Launch pages" body="MVPs, waitlists, mailing-list landing pages. Wire signup forms into a Swyftstack Postgres database." />
        </div>
      </Section>

      <FAQSection title="Static sites FAQ" items={FAQ} />

      <CTASection
        title="Ship your site for free. Today."
        subtitle="Sign up, build your site locally, drag the output folder into the console. Add a domain when you're ready - or never. We don't mind."
      />
    </MarketingShell>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-card">
      <div style={{ fontWeight: 700, color: "var(--m-text-strong)", marginBottom: 6 }}>{title}</div>
      <p className="m-feature-body" style={{ margin: 0 }}>{body}</p>
    </div>
  );
}
