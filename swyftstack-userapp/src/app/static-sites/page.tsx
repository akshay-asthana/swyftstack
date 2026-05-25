// /static-sites — public marketing page for the free static hosting product.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard } from "@/components/marketing/sections";
import { StaticCode } from "@/components/marketing/code-snippet";
import { ArrowRightIcon, BoltIcon, GlobeIcon, LockIcon, TerminalIcon } from "@/components/marketing/icons";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free static site hosting with custom domains — Swyftstack",
  description: "Drag a folder. Push to Git. Either way your site is live with HTTPS — no bandwidth cap, no build minute limit, no free-until-we-change-our-mind.",
  alternates: { canonical: `${SITE_URL}/static-sites` },
};

const FAQ = [
  { q: "Is it really free?", a: "Yes. Static hosting costs us almost nothing to serve — charging for it would be silly. We'd rather you fall in love with the dashboard and upgrade when you need a database." },
  { q: "What about bandwidth limits?", a: "Unmetered on static sites. We reserve the right to follow up if you're regularly serving multi-TB days, but in practice we haven't had to." },
  { q: "Can I deploy a Next.js app?", a: "Yes, as a static export (`next export`). For server-rendered Next.js, host the app on Vercel/Netlify/Fly and connect to Swyftstack PostgreSQL." },
  { q: "Can I get logs?", a: "Yes. Access logs are surfaced on the dashboard, with download on Pro and above." },
];

const FRAMEWORKS = ["Next.js (export)", "Astro", "Hugo", "Eleventy", "SvelteKit (static)", "VitePress", "Docusaurus", "Jekyll", "Nuxt (generate)", "Gatsby", "Plain HTML", "MkDocs"];

export default function StaticSitesPage() {
  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ} />

      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Free static site hosting</div>
          <h1>Custom domains. Automatic HTTPS. <span className="m-text-grad">Free forever</span>.</h1>
          <p className="m-hero-lead">
            Drag a folder or push to Git — live in seconds with HTTPS and unmetered bandwidth.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
              Deploy a site <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/pricing">See pricing</Link>
          </div>
        </div>
      </section>

      <Section borderTop>
        <SectionHead
          eyebrow="What's included"
          title="The full hosting kit, included"
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<GlobeIcon size={22} />} title="Custom domains" body="Bring your apex, www, or any subdomain. Verified via DNS in seconds." />
          <FeatureCard icon={<LockIcon size={22} />} title="Automatic HTTPS" body="Certificates issued and renewed automatically. No cron jobs, no expirations." />
          <FeatureCard icon={<BoltIcon size={22} />} title="Deploy from Git or drag-and-drop" body="GitHub, GitLab, or just upload a folder. Every push redeploys; rollbacks one click away." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="Unmetered bandwidth" body="No fair-use shutoffs. Spike days, launch days, viral days — all on us." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="Unmetered build minutes" body="Build long. Build often. Build wherever. We don't bill by the second on static sites." />
          <FeatureCard icon={<GlobeIcon size={22} />} title="5 sites on Starter, unlimited on Pro" body="Spin up a marketing site, a docs site, a status page, a launch microsite — same plan." />
        </div>
      </Section>

      <Section alt>
        <SectionHead
          eyebrow="Frameworks"
          title="If it builds to a folder, we deploy it"
          subtitle="No magic adapters. Point us at your build output and we serve it."
        />
        <div className="m-grid m-grid-4">
          {FRAMEWORKS.map((f) => (
            <div key={f} className="m-card" style={{ textAlign: "center", padding: 16 }}>
              <span style={{ fontWeight: 650, color: "var(--m-text-strong)" }}>{f}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow="How to deploy"
          title="Two equally fast ways"
        />
        <div className="m-grid m-grid-2">
          <div className="m-card">
            <h3>Option 1 — Connect Git</h3>
            <p className="m-feature-body m-mt-3">
              Click <strong>New site</strong>, connect your GitHub or GitLab account, pick a repo
              and branch. Set a build command (or leave it blank for already-built sites). Every
              push to the branch redeploys.
            </p>
          </div>
          <div className="m-card">
            <h3>Option 2 — Drag and drop</h3>
            <p className="m-feature-body m-mt-3">
              Click <strong>New site</strong>, drag your <code style={{ fontFamily: "var(--m-font-mono)", padding: "1px 6px", background: "var(--m-bg-2)", borderRadius: 5 }}>dist</code>, <code style={{ fontFamily: "var(--m-font-mono)", padding: "1px 6px", background: "var(--m-bg-2)", borderRadius: 5 }}>build</code>, or <code style={{ fontFamily: "var(--m-font-mono)", padding: "1px 6px", background: "var(--m-bg-2)", borderRadius: 5 }}>out</code> folder onto the page. Done — live in seconds.
            </p>
          </div>
        </div>
        <div className="m-mt-7">
          <StaticCode
            language="sh"
            name="zsh"
            code={`# CI deploy with the Swyftstack CLI
npx swyftstack deploy ./dist \\
  --site my-marketing-site \\
  --token "$SWYFTSTACK_TOKEN"`}
          />
        </div>
      </Section>

      <FAQSection title="Static hosting FAQ" items={FAQ} />

      <CTASection
        title="Deploy a site. Custom domain. HTTPS. Free."
        subtitle="The whole hosting kit on every plan. Start with a marketing site, add a database when you need one."
        primary={{ label: "Deploy a site — free, forever", href: "/signup" }}
        secondary={{ label: "Add a database", href: "/postgres" }}
      />
    </MarketingShell>
  );
}
