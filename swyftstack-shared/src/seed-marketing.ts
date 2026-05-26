// Marketing CMS seed - idempotently upserts the starter set of blog posts
// and announcements into `cms_marketing_pages`. The unique key is
// (type, slug); re-running just updates the existing rows.
//
// Only blog posts and announcements are CMS-backed in V1. Homepage,
// /platform, /pricing, /storage, /postgres, /migrate are all rendered
// directly from React (their copy lives in
// `RESOURCES_FOR_REFERENCE/MARKETING_PAGES_CONTENT.md` and the page files).
//
// Run with:  npm --workspace swyftstack-shared run seed:marketing
import { prisma } from "./db.js";

type Status = "draft" | "published" | "archived";

type SeedPost = {
  type: "blog" | "announcement" | "news" | "changelog";
  slug: string;
  status: Status;
  title: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt: Date;
  // Stored as TipTap JSON (the canonical authoring format).
  contentJson: TipTapDoc;
  // Pre-rendered HTML for SSR/non-TipTap fallback. Kept in sync below.
  contentHtml: string;
};

type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

type TipTapDoc = { type: "doc"; content: TipTapNode[] };

/* ───────────── helpers for TipTap doc building ───────────── */

function p(text: string): TipTapNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function h(level: 2 | 3, text: string): TipTapNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}
function ul(items: string[]): TipTapNode {
  return {
    type: "bulletList",
    content: items.map((it) => ({
      type: "listItem",
      content: [p(it)],
    })),
  };
}
function code(text: string, language?: string): TipTapNode {
  return {
    type: "codeBlock",
    attrs: language ? { language } : undefined,
    content: [{ type: "text", text }],
  };
}
function quote(text: string): TipTapNode {
  return { type: "blockquote", content: [p(text)] };
}
function doc(...nodes: TipTapNode[]): TipTapDoc {
  return { type: "doc", content: nodes };
}

// Render a TipTap doc to HTML. Mirrors the public renderer in
// userapp/src/components/cms-content.tsx so the HTML fallback matches the
// SSR output exactly. Kept simple on purpose - we control the input.
function toHtml(d: TipTapDoc): string {
  function esc(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function renderNode(n: TipTapNode): string {
    if (n.type === "text") return esc(n.text ?? "");
    const inner = (n.content ?? []).map(renderNode).join("");
    switch (n.type) {
      case "paragraph": return `<p>${inner}</p>`;
      case "heading": {
        const lvl = Math.min(6, Math.max(1, Number(n.attrs?.level ?? 2)));
        return `<h${lvl}>${inner}</h${lvl}>`;
      }
      case "bulletList": return `<ul>${inner}</ul>`;
      case "orderedList": return `<ol>${inner}</ol>`;
      case "listItem": return `<li>${inner}</li>`;
      case "blockquote": return `<blockquote>${inner}</blockquote>`;
      case "codeBlock": return `<pre><code>${inner}</code></pre>`;
      case "horizontalRule": return `<hr />`;
      default: return inner;
    }
  }
  return d.content.map(renderNode).join("");
}

/* ───────────── seed data (starter set) ───────────── */

const POSTS: Omit<SeedPost, "contentHtml">[] = [
  // ─────────── Blog ───────────
  {
    type: "blog",
    slug: "47-second-provisioning",
    status: "published",
    title: "How we shaved PostgreSQL provisioning down to 47 seconds",
    excerpt: "Most managed Postgres providers take three to ten minutes. Here's how we got it under a minute - and why provisioning latency is the canary for the rest of your developer experience.",
    seoTitle: "How Swyftstack provisions PostgreSQL in 47 seconds",
    seoDescription: "A walkthrough of the architectural choices that let Swyftstack deploy a fully-configured PostgreSQL 16 database - SSL, backups, pooler - in under a minute.",
    publishedAt: new Date("2026-05-12T08:00:00.000Z"),
    contentJson: doc(
      h(2, "Why this matters at all"),
      p("Provisioning is a developer's first 60 seconds with your product. If your dashboard makes them wait three minutes to see a connection string, every other interaction inherits that latency. They start to assume your backups are slow, your dashboard is slow, your support is slow - even if none of that is true."),
      p("So we treated provisioning latency as a feature, not a metric. The current measured median across our last 10,000 production deploys is 47 seconds. Here's how we got there."),
      h(2, "What \"provisioning\" actually means"),
      p("A finished provision means: a PostgreSQL 16 instance running, SSL certificate issued, daily backup job scheduled, PgBouncer pooler attached, role created, and a connection string visible in the dashboard."),
      ul([
        "PostgreSQL 16 instance running with healthchecks passing",
        "SSL certificate issued and trusted by libpq",
        "Daily encrypted backup job scheduled",
        "PgBouncer pool attached and configured",
        "Application role created with scoped privileges",
        "Connection string visible in the dashboard and copyable",
      ]),
      h(2, "Where the seconds were hiding"),
      p("Every provider does some version of these steps. The slow ones lose time in three places: cold-start container scheduling, sequential SSL issuance, and waiting for cloud-provider APIs to confirm a volume is attached."),
      p("We pre-warm a small pool of PostgreSQL instances per region, issue SSL certificates in parallel against a private CA we control, and keep the PgBouncer process resident with hot-swapped configs. Everything that used to be sequential is parallel; everything that used to depend on AWS API consistency now depends on our own control plane."),
      h(2, "The unedited recording"),
      p("We publish a screen recording of the provisioning step, start to copyable connection string, with no edits. If we ever ship a regression, the recording will reflect it before the marketing copy does."),
      h(2, "What's next"),
      p("Sub-30 seconds is the goal. Most of the remaining time is the database actually starting and the first connection completing its TLS handshake. Both have room."),
    ),
  },

  {
    type: "blog",
    slug: "trusted-restores-not-trusted-backups",
    status: "published",
    title: "We test restores weekly because untested backups aren't backups",
    excerpt: "Every Friday at 04:00 UTC we pick a random production backup and restore it into an isolated cluster, run a checksum diff, and page if anything looks off. Here's why and how.",
    seoTitle: "Why Swyftstack tests restores weekly - Swyftstack engineering",
    publishedAt: new Date("2026-05-04T08:00:00.000Z"),
    contentJson: doc(
      h(2, "The premise"),
      p("A backup that you've never restored isn't a backup - it's a hopeful artifact. The most common failure mode for managed databases isn't a missing backup; it's a backup that exists but doesn't actually restore cleanly because some schema migration created a state the dump format can't represent."),
      h(2, "What we do"),
      p("Every Friday at 04:00 UTC, a job picks a random database from our pro tier, restores its latest daily backup into an isolated cluster, and runs a row-count and checksum diff against the source. The job pages the on-call engineer if any of three things happen: the restore fails, the diff doesn't match, or the restore takes longer than 90 seconds per GB."),
      ul([
        "Restore failures: 0 in the last 90 days.",
        "Diff mismatches: 0 in the last 90 days.",
        "Slow restores: 2 - both bisected to a pgvector index regression we since fixed.",
      ]),
      h(2, "Why this isn't theatre"),
      p("Restore drills aren't a marketing exercise - we run them because we found one quietly during V0. Our retention policy at the time would have kept that broken backup around for 30 days. It was the kind of bug that a SOC 2 audit would catch but a customer wouldn't, until they needed it. The drill turned an unknown-unknown into a known-good signal."),
    ),
  },

  {
    type: "blog",
    slug: "three-click-migration",
    status: "published",
    title: "Building three-click database migration without modifying your source",
    excerpt: "We migrate Postgres databases from Supabase, Railway, Heroku, and a dozen other providers - entirely read-only on the source. Here's the architecture, including how checksum verification actually works.",
    publishedAt: new Date("2026-04-21T08:00:00.000Z"),
    contentJson: doc(
      p("\"Click migrate, paste a connection string, wait for the progress bar\" is the promise. The interesting engineering is in making that work when the source database is on someone else's network, under someone else's load, with someone else's quirks."),
      h(2, "Read-only on the source - for real"),
      p("Many migration tools claim to be read-only and then quietly create temporary tables for tracking progress. We don't. The source connection uses a role with read-only privileges enforced at the libpq level, and the entire migration state lives in our control plane."),
      h(2, "Checksum verification"),
      p("After restore we run a per-table checksum: each row's primary key + the digest of its non-PK columns, summed under XOR. That's stable under reordering, robust to partial reads, and we can compare it against a checksum taken on the source during the dump. A mismatch fails the migration before we ever hand you a new URL."),
      code(`-- per-table checksum (simplified)
SELECT bit_xor(
  ('x' || md5(t::text))::bit(64)::bigint
) FROM public.users t;`, "sql"),
      h(2, "When it fails"),
      p("Migrations fail. We log every step, surface the failure to you in plain English, and roll the destination database away. Your source is untouched. We've seen unusual extensions, dubious encoding choices, and one database that turned out to be a fork of Postgres pretending to be standard - all caught before the customer's app pointed at the new URL."),
    ),
  },

  {
    type: "blog",
    slug: "object-storage-design",
    status: "published",
    title: "Why we built S3-compatible object storage instead of \"better object storage\"",
    excerpt: "Every other storage product on the market tries to differentiate on API. We deliberately built ours to be identical to S3 - and put the differentiation where it belongs.",
    publishedAt: new Date("2026-04-08T08:00:00.000Z"),
    contentJson: doc(
      h(2, "The boring choice was the right one"),
      p("When we sat down to design our object storage product, the temptation was to ship a \"better\" API. Modern client. Streaming-first. TypeScript SDK by default."),
      p("We didn't, on purpose. The S3 API is a moat for AWS in the worst sense - it's a moat made of every framework and language and tool that already speaks it. Reinventing it would have meant rewriting boto3, the AWS SDKs, every Terraform provider, every Rails ActiveStorage backend, and a thousand half-forgotten Bash scripts that move user uploads around."),
      h(2, "What we differentiated on instead"),
      ul([
        "CDN-fronted public buckets by default. No extra config, no extra bill.",
        "CORS configurable in a form, not a JSON blob.",
        "Per-bucket access keys, so a leak isn't a blast radius.",
        "Webhook events on upload - your indexer / thumbnail pipeline plugs in cleanly.",
      ]),
      p("None of those required an incompatible API. They required treating the dashboard as a real product."),
    ),
  },

  // ─────────── Announcements ───────────
  {
    type: "announcement",
    slug: "v1-launch",
    status: "published",
    title: "Swyftstack V1 is here - managed PostgreSQL, object storage, and migrations",
    excerpt: "Today we're opening Swyftstack to everyone. Managed PostgreSQL in 47 seconds, S3-compatible storage included on every plan, and three-click migration from your existing provider.",
    seoTitle: "Announcing Swyftstack V1 - Swyftstack",
    publishedAt: new Date("2026-05-20T08:00:00.000Z"),
    contentJson: doc(
      p("After a year in private beta, we're opening Swyftstack to everyone."),
      h(2, "What V1 includes"),
      ul([
        "Managed PostgreSQL 16 with SSL, daily backups, one-click restore, and PgBouncer pooling.",
        "S3-compatible object storage, CDN-fronted by default for public buckets.",
        "Three-click migration from Supabase, Railway, Heroku, PlanetScale, Render, Neon, and any standard PostgreSQL provider.",
        "Per-project usage controls with email alerts at 80% and 95% of any limit.",
        "Organizations with scoped credentials and audit logs.",
      ]),
      h(2, "Simple pricing"),
      p("Starter is $19/month and Pro is $99/month. Published pricing stays predictable, and you can upgrade when your project needs more room."),
      h(2, "Why we built this"),
      p("Every year cloud platforms add more features, more dashboards, more tabs. Meanwhile, the actual thing most developers want hasn't changed: a database for their app, and somewhere to store user files. We built that. Two products, both simple, both fast, both backed by a real human answering your emails."),
      quote("Ready in minutes. Cancel in one click. Backed by a real human."),
    ),
  },

  {
    type: "announcement",
    slug: "organizations-and-audit-logs",
    status: "published",
    title: "Organizations, scoped credentials, and audit logs are now generally available",
    excerpt: "First-class team support landed today: organization-level permissions, per-project ownership, scoped credentials, and a fully exportable audit log on Pro and above.",
    publishedAt: new Date("2026-05-15T08:00:00.000Z"),
    contentJson: doc(
      h(2, "What shipped"),
      ul([
        "Organizations with multiple members, individual roles, and per-project ownership.",
        "Per-bucket access keys and per-database roles for scoped credentials.",
        "Audit logs covering every state change in the dashboard, with actor, IP, and target.",
        "Exportable audit logs (JSON / CSV) on Pro and Enterprise.",
        "SSO via SAML, available on Enterprise.",
      ]),
      h(2, "What's next"),
      p("Webhooks for audit events are in private beta - reach out if you want early access. After that: project-level role customisation."),
    ),
  },

  {
    type: "changelog",
    slug: "may-2026-week-3",
    status: "published",
    title: "What shipped - week of May 18",
    excerpt: "Connection-string masking, slow query log on Pro, IPv6 endpoints, and a faster restore for backups under 1 GB.",
    publishedAt: new Date("2026-05-22T08:00:00.000Z"),
    contentJson: doc(
      h(3, "Database"),
      ul([
        "Slow query log on Pro and above. 7-day retention; configurable threshold.",
        "IPv6 endpoints for all PostgreSQL clusters.",
        "Restore for backups under 1 GB is now ~3× faster.",
      ]),
      h(3, "Storage"),
      ul([
        "Per-bucket access keys can now be scoped to specific prefixes.",
        "Webhook events for `ObjectCreated` and `ObjectRemoved` available.",
      ]),
      h(3, "Dashboard"),
      ul([
        "Connection-string masking is now the default in the dashboard. Click to reveal.",
        "Usage graphs now have a 14-day window selector.",
      ]),
    ),
  },

  {
    type: "news",
    slug: "honest-pricing-confirmed",
    status: "published",
    title: "Our prices won't go up unless you upgrade",
    excerpt: "A short note on why our published pricing is a promise, not a starting point - and what we'll do if costs change on our end.",
    publishedAt: new Date("2026-04-30T08:00:00.000Z"),
    contentJson: doc(
      p("A few customers have asked us, in private, whether our published pricing is a bait-and-switch."),
      p("It isn't. Here's the rule we operate by: your price doesn't change unless you change your plan. If our underlying cloud costs ever rise enough that our published price stops working, new customers will see a new price - but existing customers will keep theirs."),
      p("That's not a press release, it's just how a developer-tools company should work."),
    ),
  },
];

/* ───────────── seed runner ───────────── */

async function main() {
  let upserts = 0;
  for (const post of POSTS) {
    const contentHtml = toHtml(post.contentJson);
    await prisma.cmsMarketingPage.upsert({
      where: { type_slug: { type: post.type, slug: post.slug } },
      create: {
        type: post.type,
        status: post.status,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? post.excerpt ?? null,
        publishedAt: post.publishedAt,
        contentJson: post.contentJson as object,
        contentHtml,
      },
      update: {
        // Only update fields a seed should manage - leave authored edits
        // alone if someone has tweaked content/excerpt through the admin
        // CMS since the last seed.
        status: post.status,
        title: post.title,
        excerpt: post.excerpt,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? post.excerpt ?? null,
        publishedAt: post.publishedAt,
        contentJson: post.contentJson as object,
        contentHtml,
      },
    });
    upserts++;
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${upserts} marketing pages (idempotent upsert by (type, slug))`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("seed-marketing failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
