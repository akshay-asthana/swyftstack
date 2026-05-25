# swyftstack-userapp

Public marketing site **and** authenticated customer console for Swyftstack,
in a single Next.js 14 app.

```
swyftstack-userapp/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx               ← marketing homepage
│  │  ├─ platform/page.tsx      ← product overview
│  │  ├─ postgres/page.tsx      ← managed PostgreSQL
│  │  ├─ storage/page.tsx       ← object storage
│  │  ├─ static-sites/page.tsx  ← static hosting
│  │  ├─ migrate/page.tsx       ← migration hub
│  │  ├─ pricing/page.tsx       ← pricing
│  │  ├─ blog/                  ← CMS-backed blog (index + [slug])
│  │  ├─ announcements/         ← CMS-backed announcements (index + [slug])
│  │  ├─ comparisons/[slug]     ← CMS-backed comparison pages
│  │  ├─ console/               ← authenticated customer console
│  │  ├─ sitemap.ts             ← dynamic sitemap (static + published CMS)
│  │  └─ robots.ts              ← robots.txt (blocks /console, /api, auth)
│  ├─ components/
│  │  ├─ marketing/             ← all public-site components
│  │  └─ user-shell.tsx         ← console shell (auth-only)
│  └─ styles/
│     ├─ theme.css              ← marketing design tokens
│     └─ marketing.css          ← marketing component CSS (scoped under .m)
```

## What's static vs CMS-backed

| Page                                   | Source                                    |
| -------------------------------------- | ----------------------------------------- |
| `/`, `/platform`, `/postgres`, `/storage`, `/static-sites`, `/migrate`, `/pricing`, `/about`, `/security`, `/for/*`, `/vs/*`, `/database-for-*` | **Static** — copy lives in the page files, sourced from `RESOURCES_FOR_REFERENCE/MARKETING_PAGES_CONTENT.md`. |
| `/blog`, `/blog/[slug]`, `/announcements`, `/announcements/[slug]`, `/comparisons/[slug]` | **CMS-backed** — only `published` rows from `cms_marketing_pages` are rendered. Drafts and archived rows are never crawlable. |

## Theme & design tokens

Tokens live in [`src/styles/theme.css`](./src/styles/theme.css). Edit
brand colours, gradients, shadows, spacing, radii, type scale, and the
new animation tokens (aurora, connection-line, orb gradients, motion
durations) there — everything in the marketing site reads from these
variables.

Component CSS is in [`src/styles/marketing.css`](./src/styles/marketing.css),
scoped under `.m` so it never leaks into the console shell.

## Animations

| Component                                 | Where                                | What it does                                                                 |
| ----------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| `HeroBackgroundAnimation`                 | every public hero                    | Aurora mesh + dotted grid + floating glow orbs. Pure CSS. Server component. |
| `HeroOrchestratorVisual`                  | homepage hero, `/platform` hero       | SVG architecture diagram with animated data pulses along connection paths via SMIL `<animateMotion>`. Server component. |
| `MigrationInViewAnimation`                | homepage migration section, `/migrate` hero | Wraps `MigrationAnimation` with IntersectionObserver so it only starts when scrolled into view. |
| `MigrationAnimation`                      | (inner) used by `MigrationInViewAnimation` | Simulated DATABASE_URL → progress → success cycle. |
| `InfrastructureVisual`, `BackupTimeline`, `StorageBucketVisual`, `DatabaseTableVisual`, `UsageGraphVisual`, `SignedUrlCard`, `ConnectionStringCard` | various product pages              | Stylised "dashboard-ish" visuals. Pure HTML/SVG, no JS. |

All animations respect `prefers-reduced-motion`.

## Navbar & mega menu

[`src/components/marketing/navbar.tsx`](./src/components/marketing/navbar.tsx).
Controlled mega menu (NOT CSS-only :hover) with:

- Hover bridge: a transparent `padding-top` on the dropdown wrapper means the
  cursor never leaves the controlled region when crossing from trigger to
  panel. A 180ms close timer is cancelled the moment the cursor re-enters
  either the trigger or the panel.
- Click to open / re-click to close.
- Keyboard: `Enter` / `Space` / `ArrowDown` opens the menu; `Escape` closes;
  Tab cycles through links inside.
- Outside-click and Escape close all open menus.
- Mobile drawer with collapsible `<details>` sections.

## SEO

- Every public page exports `metadata` (or `generateMetadata`) with a unique
  title, description, canonical URL, OG, and Twitter card.
- Structured data (JSON-LD) helpers in
  [`src/components/marketing/jsonld.tsx`](./src/components/marketing/jsonld.tsx):
  `OrganizationJsonLd`, `SoftwareApplicationJsonLd`, `FaqJsonLd`,
  `BlogPostingJsonLd`, `BreadcrumbJsonLd`.
- The homepage emits Organization + SoftwareApplication + FAQPage JSON-LD.
- Each blog post emits BlogPosting; each announcement emits NewsArticle.
- `app/sitemap.ts` combines static marketing routes with all *published*
  CMS rows. Drafts and archived content are excluded. The DB query is
  wrapped in try/catch so a DB outage degrades to a static-only sitemap.
- `app/robots.ts` blocks `/console`, `/api`, and every authenticated
  flow (`/login`, `/signup`, `/settings`, `/billing`, etc.).
- Blog and announcement pages use `revalidate = 60` (ISR) so CMS edits
  appear within a minute without an explicit redeploy.

## Seeding CMS content

```bash
# Idempotent. Re-running just updates the existing rows (upsert by type + slug).
npm --workspace swyftstack-shared run seed:marketing
```

The seed file is
[`swyftstack-shared/src/seed-marketing.ts`](../swyftstack-shared/src/seed-marketing.ts).
It writes a curated starter set of blog posts, announcements, and a
changelog entry — enough to make `/blog` and `/announcements` look real
out of the box. Admin authors can edit these rows in the admin CMS; the
seed only overwrites fields it explicitly manages.

## Running the userapp

```bash
npm --workspace swyftstack-userapp run dev    # http://localhost:3001
npm --workspace swyftstack-userapp run build  # production build
npm --workspace swyftstack-userapp run start  # production server
```

## Manual QA checklist

After any marketing change, verify:

- [ ] Navbar Products / Solutions / Resources menus open on hover **and** click.
- [ ] You can move the cursor from a trigger into the dropdown without it disappearing.
- [ ] Every dropdown item is clickable.
- [ ] Escape closes the menu; outside click closes the menu.
- [ ] Mobile drawer opens, sections collapse/expand, links navigate.
- [ ] Hero headline reads "Deploy production-ready database and storage for your apps, in seconds."
- [ ] Hero subheading is centered and ~720px max-width.
- [ ] Hero background animates; orchestrator visual renders; data pulses move along paths.
- [ ] Migration animation does **not** auto-start above the fold.
- [ ] Scroll to the migration section and the animation starts on its own.
- [ ] All product pages share the same theme/navbar/footer.
- [ ] `/blog` lists only published posts; draft preview links require a valid preview token.
- [ ] `/console` is reachable when signed in, redirects to login when signed out.
- [ ] `sitemap.xml` lists static routes + published CMS slugs; excludes `/console`.
- [ ] `robots.txt` disallows `/console`, `/api`, and auth-only paths.
- [ ] With `prefers-reduced-motion: reduce`, hero / orchestrator / migration animations all stop.
- [ ] No horizontal overflow at 1440px, 1024px, 768px, 375px.

## What's still bland (next pass)

The brief lists ~25 marketing pages in
`RESOURCES_FOR_REFERENCE/MARKETING_PAGES_CONTENT.md`. This pass
focused on the explicitly required public routes:

- ✅ `/`, `/platform`, `/pricing`, `/postgres` (alias `/database`), `/storage`, `/migrate`, `/blog`, `/announcements`, `/console`

Secondary routes (`/for/[slug]`, `/vs/[slug]`, `/database-for-*`,
`/postgresql-for-*`, individual `/migrate-from-*` pages, `/about`,
`/security`) inherit the new shell, theme, navbar, and footer
automatically — but their content is still the V0 placeholder. They
should each get a bespoke page in the next iteration.
