# SwyftStack Marketing Pages — V1 (Rewrite)

_Structured around real search intent. Two audience tracks: vibe coders and experienced developers. Each page lists its target keywords and what the visitor is actually trying to find out — so the content answers their question, not ours._

---

## Site map

**Core pages**

- `/` — Homepage (broad default)
- `/pricing` — Pricing
- `/managed-postgresql` — Experienced developer landing
- `/backend-for-vibe-coded-apps` — Vibe coder landing
- `/object-storage` — S3-compatible storage
- `/static-site-hosting` — Free static sites

**Tool-specific pages (high-intent SEO for vibe coders)**

- `/database-for-lovable`
- `/database-for-bolt-new`
- `/database-for-cursor`
- `/database-for-v0`

**Migration pages**

- `/migrate` — Migration hub
- `/migrate-from-supabase`
- `/migrate-from-railway`
- `/migrate-from-heroku`
- `/migrate-from-planetscale`

**Alternative / comparison pages (highest-volume commercial SEO)**

- `/supabase-alternative`
- `/railway-alternative`
- `/heroku-postgres-alternative`
- `/render-alternative`

**Framework integration pages**

- `/postgresql-for-nextjs`
- `/postgresql-for-django`
- `/postgresql-for-laravel`
- `/nodejs-postgresql`

**Trust pages**

- `/about`
- `/security`

---

## Page 1 — Homepage (`/`)

**Target keywords:** managed backend, backend as a service, postgresql hosting, app backend
**Visitor intent:** They're not sure what we are yet. They need a clear answer in 5 seconds.

### Above the fold

**Headline:**
The backend essentials for your app, ready in minutes.

**Subheadline:**
Managed PostgreSQL, S3-compatible storage, and static site hosting — one dashboard, one bill, zero setup work. Built for developers who'd rather ship than configure.

**Primary CTA:** Deploy your first database
**Secondary CTA:** Migrate from Supabase, Railway, or Heroku

**Trust strip:**
SSL on by default · Daily backups · One-click restore · 99.9% uptime SLA

### Section: Who SwyftStack is for

Two paths, one platform.

**[Card 1]**
**I'm an experienced developer or team.**
You know what managed PostgreSQL is. You know what S3-compatible storage means. You want infrastructure that's fast, predictable, and doesn't waste your time.
[See managed PostgreSQL →](/managed-postgresql)

**[Card 2]**
**I built my app with Lovable, Bolt, Cursor, or v0.**
Your app works. Now it needs a real database and somewhere to store files. We'll walk you through it without making you feel stupid.
[See backend for vibe-coded apps →](/backend-for-vibe-coded-apps)

### Section: What's included

**Managed PostgreSQL**
PostgreSQL 16 with SSL by default, daily backups, one-click restore, and connection pooling. Deploy in seconds, scale when you're ready.

**Object storage**
S3-compatible API. Every framework and SDK already speaks it. Public files get instant CDN URLs. No bucket policies to debug.

**Static site hosting**
Free, forever. Custom domains, automatic HTTPS, no bandwidth caps, no build minute limits. Deploy via Git or drag-and-drop.

### Section: Move your database in three clicks

Already using Supabase, Railway, Heroku Postgres, or PlanetScale? Paste your connection string. We pull your schema and data, verify every byte with checksums, and hand you a new connection string. Your source database is never touched.

[Start a migration →](/migrate)

### Section: Pricing preview

**Starter — $19/month**
3 PostgreSQL databases, 10 GB storage, 100 GB object storage, 500 GB egress, daily backups (7 days), 2 team members.

**Pro — $99/month**
20 PostgreSQL databases, 100 GB storage, 1 TB object storage, 5 TB egress, daily backups (30 days), 10 team members, email support.

**Enterprise — Custom**
Unlimited everything, dedicated Slack channel, 99.99% SLA, custom contracts.

**Launch offer (first 500 customers only):** $9/month Starter or $49/month Pro for your first 2 months.

[See full pricing →](/pricing)

### Section: How fast is "in minutes"?

We timed it: a fully provisioned PostgreSQL 16 database with SSL enabled, backups configured, and a copyable connection string — in 47 seconds. We publish the unedited recording.

_[Embed: 47-second screen recording]_

### Section: FAQ

**Why no free tier?**
Free tiers force every paying customer to subsidize freeloaders. We'd rather charge a fair price and give every customer real infrastructure and real human support.

**Can I bring my own auth?**
Yes — most customers use NextAuth, Clerk, Auth0, or Supabase Auth alongside SwyftStack. We focus on database and storage; you pick your auth.

**Where's my data stored?**
US or EU — you choose at signup. Encrypted in transit and at rest. Backups encrypted too.

**What if my app outgrows the Starter plan?**
Click upgrade. Same database, same connection string, more headroom.

### Final CTA

**Ready in minutes. Cancel in one click. Backed by a real human.**
[Deploy your first database]

---

## Page 2 — Pricing (`/pricing`)

**Target keywords:** postgresql hosting pricing, managed database pricing, backend hosting cost
**Visitor intent:** They want to know exactly what they'll pay and whether it's worth it.

### Headline

Honest pricing. No surprises on your bill.

### Subheadline

Pick a plan. Pay monthly or save with annual. Upgrade or cancel anytime — one click, no calls.

### Billing toggle

[ Monthly | **Annual — save up to 21%** ] _(Annual selected by default)_

### Pricing cards

#### Starter — $15/month annually ($19/mo monthly)

For solo founders, freelancers, and first launched apps.

- 3 PostgreSQL databases
- 10 GB database storage total
- 100 GB object storage
- 500 GB egress
- Daily backups, kept 7 days
- One-click restore
- One-click migration in
- 5 static sites with custom domains
- 2 team members
- 99.9% uptime SLA

**CTA:** Start with Starter

#### Pro — $83/month annually ($99/mo monthly) — _Most popular_

For agencies, small teams, and apps doing real numbers.

- 20 PostgreSQL databases
- 100 GB database storage total
- 1 TB object storage
- 5 TB egress
- Daily backups, kept 30 days
- One-click restore
- One-click migration in
- Unlimited static sites and custom domains
- 10 team members
- Email support — 24-hour response guarantee
- 99.95% uptime SLA

**CTA:** Go Pro

#### Enterprise — Talk to us

For when uptime is the whole business.

- Unlimited everything
- Custom infrastructure sizing
- Dedicated Slack channel
- Custom backup retention
- 99.99% uptime SLA
- Custom contracts, DPA, and security review

**CTA:** Talk to the founder

### Launch offer banner

🎉 **First 500 customers**
$9/month Starter or $49/month Pro for your first 2 months. Applied automatically at signup.

### Section: What everyone gets

SSL on every database. Daily automated backups. One-click restore. Plain-English error messages. A real human answering support emails.

### Section: Pricing FAQ

**Why no free tier?**
Free tiers attract users who don't get serious support and force paying customers to subsidize them. We'd rather charge a fair price and treat every project seriously.

**What happens when I hit my storage limit?**
We email you at 80% and 95%. Your database keeps working. Upgrade in one click.

**Can I change plans?**
Yes. Upgrades are instant. Downgrades take effect at the end of your billing cycle.

**Do you charge for inbound traffic?**
No. Only egress counts toward your limit.

**Do I save much with annual?**
21% on Starter, 16% on Pro. We also send your invoice up front, which helps you expense it.

### Final CTA

**Two minutes to sign up. Sixty seconds to deploy.**
[Start with Starter] [Go Pro]

---

## Page 3 — Managed PostgreSQL (`/managed-postgresql`)

**Target keywords:** managed postgresql, postgresql hosting, postgresql as a service, postgresql cloud
**Visitor intent:** They know what they want. They're evaluating providers. They want specs, performance, and pricing — not a sales pitch.

### Headline

Managed PostgreSQL, deployed in seconds.

### Subheadline

PostgreSQL 16 with SSL, daily backups, one-click restore, and a connection string ready to paste — provisioned in under a minute. Built for developers who'd rather ship than configure.

**Primary CTA:** Deploy a database
**Secondary CTA:** See benchmarks

### Section: Specs (the part you actually came here for)

- **PostgreSQL version:** 16 (with 17 in preview)
- **Connections:** Up to 100 on Starter, up to 500 on Pro, custom on Enterprise
- **Connection pooling:** PgBouncer included, configured automatically
- **Extensions enabled by default:** `uuid-ossp`, `pgcrypto`, `pg_trgm`, `citext`, `hstore`, `unaccent`, `btree_gin`, `btree_gist`
- **Other extensions available:** PostGIS, `pg_stat_statements`, `pg_cron`, `pgvector`, full list in docs
- **SSL:** Required by default, not optional
- **Backups:** Daily, encrypted, retained 7 days (Starter) or 30 days (Pro)
- **Restore:** Any backup, one click, into a new database or replacing the existing one
- **Regions:** US-East, US-West, EU-Central (more coming)
- **Underlying hardware:** NVMe SSD, dedicated CPU on Pro and above

### Section: How fast is provisioning?

47 seconds from clicking "Deploy" to a working database with SSL enabled, backups configured, and a connection string ready to copy. We publish the unedited recording so you can verify it yourself.

This matters for two reasons. First, it means you can spin up throwaway databases for testing, demos, or branches without losing your flow. Second, it's a signal — if the provisioning step is fast, everything else is probably fast too.

### Section: Migrating from another provider

Paste your existing PostgreSQL connection string. We use standard PostgreSQL tools internally (`pg_dump` / `pg_restore`), verify every table and row count with checksums, and hand you a new connection string when it's done. Your source database is never modified.

Works with Supabase, Railway, Heroku Postgres, Render, Neon, AWS RDS, Google Cloud SQL, and any standard PostgreSQL provider.

[Start a migration →](/migrate)

### Section: Operational details

**Monitoring**
CPU, memory, disk I/O, active connections, query rate — visible on the dashboard. Slow query log available on Pro and above.

**Alerting**
Email alerts at 80% and 95% of any resource limit. Webhook alerts on Pro.

**Maintenance windows**
We patch security updates within 24 hours of upstream release. Major version upgrades are opt-in with rollback windows.

**Logging**
PostgreSQL logs available in the dashboard for the last 7 days (Starter) or 30 days (Pro). Streaming to external logging providers on Pro and above.

### Section: Connection examples

Standard PostgreSQL — connects with any client.

**psql:**

```bash
psql "postgresql://user:pass@host.swyftstack.com:5432/dbname?sslmode=require"
```

**Node.js (pg):**

```js
import pg from "pg";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
```

**Python (psycopg):**

```python
import psycopg
conn = psycopg.connect(os.environ["DATABASE_URL"], sslmode="require")
```

**GUI clients:** TablePlus, DBeaver, pgAdmin, DataGrip — all connect normally with the connection string.

### Section: Pricing

Starts at $19/month for 3 databases and 10 GB storage. Pro at $99/month gets 20 databases and 100 GB. Both include daily backups, one-click restore, and the full feature set.

[See full pricing →](/pricing)

### Section: FAQ

**Is this real PostgreSQL or a fork?**
Real PostgreSQL. Same binaries from postgresql.org. We don't fork or modify the engine.

**Can I run `pg_dump` against my SwyftStack database?**
Yes. We don't restrict standard PostgreSQL tooling.

**Do you support read replicas?**
Coming after V1. Tell us if you need it and we'll move it up.

**Do you offer point-in-time recovery?**
Available on Enterprise. We'll tell you honestly if your use case needs it or not.

**Can I bring my own SSL certificate?**
On Enterprise. Default certificates are managed by us and auto-renewed.

**Can I IP-allowlist connections?**
Yes — connection rules in the dashboard. Default is open with strong auth; you can restrict to specific IPs or CIDR ranges.

### Final CTA

[Deploy a database — $19/month]
[Compare to your current provider]

---

## Page 4 — Backend for Vibe-Coded Apps (`/backend-for-vibe-coded-apps`)

**Target keywords:** backend for lovable app, backend for bolt.new, backend for vibe coded app, how to add database to ai app
**Visitor intent:** They built something with AI, it works in the preview, and they're stuck on the part nobody warned them about. They need a clear walkthrough and reassurance that they're not in over their head.

### Headline

You built an app. Here's what makes it real.

### Subheadline

You used Lovable, Bolt, Cursor, or v0 to build something amazing. The preview works. The design is great. Now your app needs a real backend — a place to save user data and store files — so it can work for actual people. That's what we do.

**CTA:** Deploy my first backend

### Section: First, let's explain what a "backend" actually is

Skip this section if you already know. Otherwise: when you use Lovable or Bolt, your app has two parts.

**The front end** is what users see — the buttons, pages, and design. Your AI tool builds this part beautifully.

**The backend** is the part users never see, but their data depends on. It's where accounts are stored. Where uploaded photos live. Where orders get saved. Without a backend, your app is a pretty design that forgets everything as soon as a user closes the tab.

SwyftStack is the backend. Specifically, we give you two things your app needs to function:

1. **A database** — where your users' data is saved. Their accounts, their posts, anything they create.
2. **File storage** — where their uploaded files live. Profile pictures, PDFs, attachments.

You connect both to your app with one piece of text — a connection string — and your app becomes real.

### Section: How to add a backend to a Lovable / Bolt / Cursor / v0 app

The process is the same regardless of which tool you used. Here's the whole thing:

**Step 1 — Sign up for SwyftStack and create a database.**
You'll see a button labeled "Create database." Click it. Wait about 47 seconds. You'll see a long piece of text appear — that's your _connection string_. Copy it.

**Step 2 — Paste it into your AI tool.**
Every AI builder has somewhere to add environment variables. Find the spot labeled `DATABASE_URL` and paste your connection string there. Save.

**Step 3 — Tell your AI what to do with it.**
Type a prompt like:

> "Use the connected database to save user accounts and their posts. Create the necessary tables."

Your AI tool will write the code to make this work.

**Step 4 — Test it.**
Sign up as a user in your own app. Close the tab. Reopen it. Log back in. If your account is still there, your backend is working.

That's it. Your app is now a real app.

### Section: Tool-specific guides

We have detailed walkthroughs for each AI builder, with screenshots and exact buttons to click.

- [Add a database to your Lovable app →](/database-for-lovable)
- [Add a database to your Bolt.new app →](/database-for-bolt-new)
- [Add a database to your Cursor app →](/database-for-cursor)
- [Add a database to your v0 app →](/database-for-v0)

### Section: But what about file uploads?

If your app lets users upload anything — profile pictures, documents, photos — you need _file storage_. SwyftStack includes this on every plan.

Your AI tool already knows how to use file storage. Tell it:

> "Use the connected S3 storage to handle file uploads. Save the URLs in the database."

It'll figure out the rest. The file storage details (access key, secret key, endpoint) are in your SwyftStack dashboard, ready to copy.

### Section: What if I break my app?

You probably won't, but here's the safety net:

- Your old setup keeps working until you change the connection string in your app. If something looks wrong, switch back.
- We back up your database every day automatically. If you accidentally delete something, click restore.
- We have a real human (a person, not a chatbot) who answers support emails. If you're stuck, email us — most replies come within an hour.

### Section: How much does this cost?

$9 per month for the first 2 months, then $19 per month. That covers:

- 3 databases (most apps only need 1)
- 100 GB of file storage
- 500 GB of bandwidth
- Daily backups
- A custom domain for your website
- Real human support

Most apps fit comfortably on this plan even after they start growing. If your app gets really popular, you can upgrade to $99/month for 10x the capacity, and nothing breaks during the upgrade.

### Section: Real people who've done this

> "I'd spent two days trying to figure out how to add a database to my Lovable app. SwyftStack got me unstuck in five minutes. I almost cried."
> — _Saanvi M., built an event RSVP app_

> "I don't really know what a connection string is, technically. But I know how to copy and paste, and that's all SwyftStack asked of me."
> — _James O., built a marketplace_

> "My app finally remembers users between visits. That sounds basic but it's the thing that took me from a demo to a real product."
> — _Priya T., built a habit tracker_

### Section: FAQ

**Do I need to know how to code?**
You need to know how to copy and paste. That's the bar. Your AI tool does the rest.

**Will this work with my existing app?**
If your app was built with Lovable, Bolt, Cursor, v0, or any other AI tool that produces a real codebase — yes.

**What if I get stuck?**
Email support@swyftstack.com. A human replies within a day, usually within an hour. We've helped hundreds of people through this exact moment.

**Can I move to a different provider later?**
Yes. PostgreSQL (the database we use) is the standard. You can move to anyone else, ever, with no lock-in. We'll even help you export.

**Is my data safe?**
SSL is on by default. Backups are encrypted. Daily restore points. Two-factor authentication on your account. Same security as the big players — we just don't make a big show of it.

### Final CTA

**You built it. Now ship it.**
[Deploy my first backend — $9/month for your first two months]

---

## Page 5 — Database for Lovable (`/database-for-lovable`)

**Target keywords:** lovable database, database for lovable app, lovable backend, how to add database to lovable
**Visitor intent:** They built an app on Lovable. They want a step-by-step guide for their specific tool.

### Headline

Add a real database to your Lovable app in 5 minutes.

### Subheadline

Lovable builds beautiful apps fast. SwyftStack gives those apps a real PostgreSQL database, so they can remember users, save data, and work for real people. Here's exactly how to connect them.

**CTA:** Get a database for my Lovable app

### Section: Why your Lovable app needs SwyftStack

Lovable handles the design and code. What it doesn't handle is the _persistent backend_ — the part that remembers your users' data between visits. By default, anything your Lovable preview saves disappears when the user refreshes.

A connected PostgreSQL database fixes this. Your users sign up, their accounts stick around. They post something, it's still there tomorrow. That's the moment your app stops being a demo and becomes a product.

### Section: Step-by-step walkthrough

**Step 1 — Create a SwyftStack account and a database**

1. Sign up at swyftstack.com (takes 30 seconds)
2. On your dashboard, click **"Create database"**
3. Pick a region close to your users (US-East is a good default)
4. Wait about 47 seconds
5. You'll see a screen with your **connection string** — a long piece of text starting with `postgresql://`. Click **Copy**.

**Step 2 — Paste the connection string into Lovable**

1. Open your Lovable project
2. Click **Settings** (gear icon)
3. Find the section called **Environment Variables** or **Secrets**
4. Add a new variable:
   - Name: `DATABASE_URL`
   - Value: paste your connection string
5. Save

**Step 3 — Ask Lovable to use it**

In your Lovable chat, type something like:

> _Connect to the database using DATABASE_URL. Create tables for users and [whatever your app stores]. Update the existing code to save data to the database instead of in-memory storage._

Lovable will rewrite your app to use the real database. This usually takes 30-60 seconds.

**Step 4 — Test it**

1. Sign up as a user in your own app
2. Refresh the page
3. Log back in
4. If your account is still there, you're connected

That's the whole thing.

### Section: Common Lovable + SwyftStack patterns

**User accounts:**
Lovable can build email/password auth and store users in your SwyftStack database. Just ask: _"Add email/password authentication and store user accounts in the database."_

**File uploads:**
For profile pictures or attachments, ask Lovable: _"Use the SwyftStack S3 storage I've connected to handle file uploads."_ You'll need to add `SWYFTSTACK_ACCESS_KEY` and `SWYFTSTACK_SECRET_KEY` to your environment variables — both are in your SwyftStack dashboard.

**Real-time updates:**
Lovable apps can use PostgreSQL's `LISTEN/NOTIFY` for real-time features, or you can poll the database every few seconds. Ask Lovable to handle this for you.

### Section: Troubleshooting

**"My app can't connect to the database."**
Double-check that you copied the connection string completely — they're long and easy to truncate. Also confirm you saved the environment variable in Lovable.

**"Lovable says my code has errors after adding the database."**
Ask Lovable to fix them: _"There are errors after connecting the database. Please fix them and make sure the code runs."_ It'll usually resolve in one or two iterations.

**"My data isn't saving."**
Make sure the code actually writes to the database. Ask: _"Add console logs to confirm data is being saved to the database. Also confirm the table exists."_

**Still stuck?**
Email support@swyftstack.com. We've helped hundreds of Lovable builders through this exact process — a real person will reply within a day.

### Section: Pricing for Lovable builders

$9/month for your first 2 months (launch offer), then $19/month. That covers your database, file storage, and a custom domain. Most Lovable apps fit comfortably here.

### Final CTA

[Get a database for my Lovable app]

---

## Page 6 — Database for Bolt.new (`/database-for-bolt-new`)

**Target keywords:** bolt.new database, database for bolt app, bolt.new backend
**Visitor intent:** Same as Lovable — but for Bolt.new users.

### Headline

Add a PostgreSQL database to your Bolt.new app in 5 minutes.

### Subheadline

Bolt.new builds full-stack apps fast. SwyftStack gives those apps a real database that doesn't disappear when the preview restarts. Here's exactly how to connect them.

**CTA:** Get a database for my Bolt app

### Section: Why Bolt.new apps need an external database

Bolt.new runs your app in a sandboxed environment. That's great for development, but if you use Bolt's built-in storage, your data gets wiped between sessions. A connected SwyftStack database is permanent — your app's data survives restarts, refreshes, and redeploys.

### Section: Step-by-step walkthrough

**Step 1 — Create a SwyftStack database**

1. Sign up at swyftstack.com
2. Click **"Create database"** on your dashboard
3. Wait 47 seconds for it to provision
4. Copy the **connection string**

**Step 2 — Add it to Bolt.new**

1. In your Bolt project, open the file explorer
2. Find or create a `.env` file in the root
3. Add this line:
   ```
   DATABASE_URL=paste_your_connection_string_here
   ```
4. Save

**Step 3 — Tell Bolt to use it**

In the Bolt chat, type:

> _Use the DATABASE_URL environment variable to connect to a PostgreSQL database. Replace any in-memory or SQLite storage with this database. Create the necessary tables._

Bolt will rewrite your code to use the real database, usually within a minute.

**Step 4 — Verify**

Start your app in Bolt. Create a user or save some data. Restart the Bolt environment. Reopen — your data should still be there.

### Section: Bolt.new + SwyftStack tips

**Working with Prisma:**
Bolt.new often uses Prisma for database access. Update your `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then ask Bolt: _"Run `npx prisma db push` to apply the schema to the database."_

**Working with Drizzle:**
If Bolt scaffolds with Drizzle, your database client should already read from `process.env.DATABASE_URL`. Just confirm with Bolt: _"Make sure Drizzle is reading the connection string from DATABASE_URL."_

**Deploying outside Bolt:**
When you're ready to publish your app on Vercel, Netlify, or anywhere else, copy the same `DATABASE_URL` into that platform's environment variables. Your database doesn't care where the app is hosted.

### Section: Pricing

$9/month for the first 2 months, then $19/month. Includes database, file storage, and a custom domain for your finished app.

### Final CTA

[Get a database for my Bolt app]

---

## Page 7 — Database for Cursor (`/database-for-cursor`)

**Target keywords:** cursor database, database for cursor, postgres for cursor projects
**Visitor intent:** They're building with Cursor (more developer-y than Lovable/Bolt users). They want practical setup, less hand-holding.

### Headline

PostgreSQL for your Cursor projects, ready in seconds.

### Subheadline

You're using Cursor to build something real. SwyftStack gives you a managed PostgreSQL database with a copyable connection string — no AWS console, no setup, no yak shaving.

**CTA:** Deploy a database

### Section: Setup

**1.** Deploy a database on SwyftStack — one click, 47 seconds.
**2.** Copy your connection string.
**3.** In your Cursor project, add it to `.env.local`:

```
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
```

**4.** Ask Cursor to set up your data layer:

> _Set up Prisma (or Drizzle, or raw pg) to use DATABASE_URL. Create models for [your domain] and run the initial migration._

Done.

### Section: What Cursor users typically build with SwyftStack

- **SaaS prototypes** — Next.js + PostgreSQL + S3 storage, fully working before you commit to a stack
- **Internal tools** — Quick admin dashboards backed by a real database
- **Side projects** — The ones that might be a business one day, so they deserve a real backend

### Section: Connecting from Cursor's terminal

Since Cursor includes a full terminal, you can run `psql` directly:

```bash
psql $DATABASE_URL
```

You can also run database migrations, seed scripts, and `prisma studio` against your SwyftStack database the same way you would locally.

### Section: Pricing

$19/month (or $9 for the first 2 months at launch). Includes 3 databases, so you can keep separate environments for development, staging, and production.

### Final CTA

[Deploy a database for my Cursor project]

---

## Page 8 — Database for v0 (`/database-for-v0`)

**Target keywords:** v0 database, database for v0, vercel v0 backend
**Visitor intent:** They generated UI with v0 and need a database to make it functional.

### Headline

Connect a real database to your v0 app in 5 minutes.

### Subheadline

v0 by Vercel generates beautiful UI components and full apps. SwyftStack adds the missing piece — a managed PostgreSQL database your v0 app can actually save data to.

**CTA:** Get a database for my v0 app

### Section: Walkthrough

**Step 1 — Create your database**
Sign up at swyftstack.com, click "Create database," wait 47 seconds, copy the connection string.

**Step 2 — Add it to your v0 project**
v0 projects typically deploy to Vercel. Add your connection string as an environment variable:

- In v0 chat: ask v0 to use `process.env.DATABASE_URL` for database access
- In Vercel: project settings → Environment Variables → add `DATABASE_URL`

**Step 3 — Ask v0 to wire it up**

> _Use Prisma (or Drizzle) with DATABASE_URL to add a real database to this app. Replace any mock data with database queries._

v0 will generate the schema, the database client, and update the components.

**Step 4 — Deploy**
Push to GitHub. Vercel deploys your front end. SwyftStack hosts your database. They talk to each other over the encrypted connection string.

### Section: Pricing

$9/month for the first 2 months, then $19/month. Same connection string works in v0 preview, local dev, staging, and production.

### Final CTA

[Get a database for my v0 app]

---

## Page 9 — Object Storage (`/object-storage`)

**Target keywords:** s3 compatible storage, object storage for web apps, s3 alternative
**Visitor intent:** They need to store files. They want an S3-compatible API without the AWS bill or AWS complexity.

### Headline

S3-compatible object storage, without the AWS bill.

### Subheadline

Store images, PDFs, user uploads, and anything else your app generates. Every framework and SDK already knows how to talk to it — change one line (the endpoint) and you're done.

**CTA:** Start storing files

### Section: Why we built this

Every modern app needs to store files. The default is AWS S3, which works but comes with a console you have to learn, bucket policies you have to write in JSON, and a bill that's hard to predict.

We built SwyftStack Storage to be S3-compatible so your code doesn't change, but everything else is simpler: a flat monthly bill, public/private as a toggle, and a dashboard you can use without a 20-page guide.

### Section: How it works

- **Same API as AWS S3** — `PutObject`, `GetObject`, `DeleteObject`, `ListObjects`, presigned URLs — all the standard operations work.
- **Public buckets get CDN URLs** — flip a toggle, your files get a fast URL that works globally.
- **Private buckets use signed URLs** — generate time-limited URLs from your app, same as you would on S3.

### Section: Code examples

**Node.js (AWS SDK v3):**

```js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY,
  },
});

await s3.send(
  new PutObjectCommand({
    Bucket: "my-app-uploads",
    Key: "users/123/avatar.png",
    Body: fileBuffer,
    ContentType: "image/png",
  }),
);
```

**Python (boto3):**

```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="https://storage.swyftstack.com",
    aws_access_key_id="...",
    aws_secret_access_key="..."
)

s3.upload_file("avatar.png", "my-app-uploads", "users/123/avatar.png")
```

**Anything else:** If it speaks S3, it speaks SwyftStack. Change the endpoint, leave everything else alone.

### Section: Pricing

Included on every plan. **Starter:** 100 GB storage, 500 GB egress. **Pro:** 1 TB storage, 5 TB egress.

For reference, that's enough to host roughly 200,000 typical avatar images or 50,000 product photos.

### Section: FAQ

**Is this actually S3-compatible or just claiming to be?**
Actually compatible. We pass the AWS S3 test suite for the operations we support. If you're using AWS SDK v2 or v3, boto3, Minio client, or any other S3 library, it'll work.

**What about CORS?**
Configurable per bucket in the dashboard. No XML files.

**Do public URLs expire?**
No. Public files have permanent URLs. Private files use signed URLs you generate with expiry times.

**Is there a CDN?**
Yes. Public buckets are CDN-fronted automatically at no extra cost.

### Final CTA

[Start storing files — included in every plan]

---

## Page 10 — Static Site Hosting (`/static-site-hosting`)

**Target keywords:** free static site hosting, static site hosting with custom domain, free website hosting
**Visitor intent:** They want to host a static site cheaply or freely with a custom domain and HTTPS.

### Headline

Free static site hosting with a custom domain and HTTPS.

### Subheadline

Drag a folder. Push to Git. Either way, your site is live in seconds with automatic HTTPS — no bandwidth cap, no build minute limit, no "free until we change our mind."

**CTA:** Deploy a site

### Section: What's included

- Custom domains
- Automatic HTTPS (certificates issued and renewed automatically)
- Deploy from GitHub, GitLab, or drag-and-drop
- Unmetered bandwidth
- Unmetered build minutes
- 5 sites on Starter, unlimited on Pro
- 5 custom domains on Starter, unlimited on Pro

### Section: Frameworks that work

Next.js (static export), Astro, Hugo, Eleventy, SvelteKit (static adapter), VitePress, Docusaurus, Jekyll, Nuxt (generate), Gatsby, plain HTML. If it builds to a folder of static files, we deploy it.

### Section: Why it's free

Static hosting costs us almost nothing to serve. Charging for it would be silly. We'd rather you try SwyftStack with your portfolio or docs site, fall in love with the dashboard, and upgrade when you need a database.

### Section: How to deploy

**Option 1 — Connect Git**

1. Click "New site"
2. Connect your GitHub or GitLab account
3. Pick a repo and branch
4. Set a build command (or leave blank for already-built sites)
5. Done — every push redeploys

**Option 2 — Drag and drop**

1. Click "New site"
2. Drag your `dist`, `build`, or `out` folder onto the page
3. Done — live in seconds

### Final CTA

[Deploy a site — free, forever]

---

## Page 11 — Migration Hub (`/migrate`)

**Target keywords:** migrate postgresql database, database migration, switch database provider
**Visitor intent:** They have a database somewhere else and want to know if moving is safe and easy.

### Headline

Move your database to SwyftStack in 3 clicks.

### Subheadline

You already have a database somewhere. Migrating usually means broken apps, lost data, and a wasted Saturday. We built migration to be different — paste your old connection string, watch the progress bar, copy your new one.

**CTA:** Start a migration

### Section: How it works

1. **Paste your existing connection string.** We connect read-only.
2. **We pull your schema and data** using standard PostgreSQL tools (`pg_dump` internally).
3. **We restore it onto your new SwyftStack database.**
4. **We verify every byte** with checksums. Tables, row counts, the lot.
5. **You get the new connection string** to drop into your app's environment variable.

Your source database is never modified. If something looks wrong, you walk away — nothing changed on your end.

### Section: Supported source providers

- [Supabase](/migrate-from-supabase)
- [Railway](/migrate-from-railway)
- [Heroku Postgres](/migrate-from-heroku)
- [PlanetScale](/migrate-from-planetscale) (MySQL → PostgreSQL — read the honest disclosure first)
- Render Postgres
- Neon
- AWS RDS (PostgreSQL)
- Google Cloud SQL (PostgreSQL)
- Any standard PostgreSQL — if it has a connection string, we can migrate it

### Section: Things to know

**Pick a quiet hour.**
Your source database isn't touched, but your _app_ needs an environment variable swap and restart. Aim for low-traffic time.

**Big databases take longer.**
Under 5 GB: typically 2–5 minutes. 5–50 GB: 10–45 minutes. Over 50 GB: email us and we'll plan it together.

**Extensions matter.**
Common ones (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `citext`, PostGIS, `pgvector`) all migrate cleanly. If you use something unusual, ask us first.

**You can always switch back.**
Until you change your app's environment variable, your old database is still serving production. If anything's off, just don't switch.

### Section: FAQ

**Will my app go down?**
Only for the seconds it takes you to update an environment variable and restart your app.

**Do you charge for migration?**
No. Migration is free. You start paying when you decide to use your new SwyftStack database.

**What if it fails?**
Nothing changes on your side. Source database untouched. Email us and we'll fix it.

### Final CTA

[Start a migration — free until you switch]

---

## Page 12 — Migrate from Supabase (`/migrate-from-supabase`)

**Target keywords:** migrate from supabase, supabase to postgresql, leave supabase
**Visitor intent:** They've decided Supabase isn't right anymore. They want a clean exit plan.

### Headline

Migrate from Supabase to SwyftStack in 3 clicks.

### Subheadline

You like Supabase — most people do. But if you want a predictable bill, a dashboard that doesn't ship a new feature every week, and managed PostgreSQL without the platform layered on top, you're in the right place.

**CTA:** Start migration

### Section: Why people leave Supabase

We hear the same reasons from migrants:

- The bill is harder to predict as the product expands
- The dashboard is getting slower as more features pile up
- They want PostgreSQL without the rest of the platform
- They're using their own auth (NextAuth, Clerk, Auth0) and don't need Supabase Auth
- They want fewer moving parts

We're not saying Supabase is bad. We're saying some people want something simpler.

### Section: How to migrate

**Step 1 — Get your Supabase connection string**
Supabase dashboard → Project Settings → Database → Connection string (URI format). Copy the full URI.

**Step 2 — Paste it into SwyftStack**
SwyftStack dashboard → Migrate → "From Supabase." Paste, click Start.

**Step 3 — Wait for the progress bar**
Usually 2–5 minutes for projects under 5 GB.

**Step 4 — Update your app**
Replace `DATABASE_URL` in your app's environment variables with the new SwyftStack connection string. Redeploy.

### Section: What migrates

- All tables, schema, indexes, and constraints
- All your data
- Foreign keys and relationships
- Common PostgreSQL extensions (uuid-ossp, pgcrypto, pg_trgm, citext, PostGIS, etc.)

### Section: What you'll handle separately

We're going to be honest about what doesn't migrate:

- **Supabase Auth users** — Auth is a separate Supabase service. Either keep Supabase Auth pointed at SwyftStack (it works — auth and database can live on different platforms), or migrate to NextAuth, Clerk, or Auth0.
- **Supabase Storage files** — If you have files in Supabase Storage, we have a separate tool for moving them to SwyftStack Storage. Both are S3-compatible.
- **Edge Functions** — SwyftStack V1 doesn't run serverless functions. Keep them on Supabase, or move logic to your application server.
- **Realtime subscriptions** — Use PostgreSQL `LISTEN/NOTIFY` directly, or keep the Supabase Realtime service pointed at your SwyftStack database.

### Section: Cost comparison

|                       | Supabase Pro | SwyftStack Starter  |
| --------------------- | ------------ | ------------------- |
| Monthly price         | $25          | **$19**             |
| Database storage      | 8 GB         | **10 GB**           |
| Object storage        | 100 GB       | 100 GB              |
| Egress included       | 250 GB       | **500 GB**          |
| Daily backups         | ✅           | ✅                  |
| Annual discount       | Limited      | **21% off**         |
| Auth service included | ✅           | ❌ (bring your own) |

### Final CTA

[Start migration — free until you switch]

---

## Page 13 — Migrate from Railway (`/migrate-from-railway`)

**Target keywords:** migrate from railway, railway postgres alternative, leave railway
**Visitor intent:** They want predictable pricing instead of usage-based billing.

### Headline

Migrate from Railway to SwyftStack in 3 clicks.

### Subheadline

Railway is great for hosting your whole app. If what you actually need is a managed database with a flat monthly bill instead of a usage meter, you're in the right place.

**CTA:** Start migration

### Section: Why people leave Railway for their database

- Usage-based pricing makes invoices unpredictable
- They want backups included, not configured separately
- They want a fixed monthly cost they can budget for
- They don't need app hosting — just the database

If you still want Railway for your app hosting, keep it. We just handle the database.

### Section: How to migrate

**Step 1 — Get your Railway PostgreSQL connection string**
Railway dashboard → your Postgres service → Connect tab → copy the "Postgres Connection URL."

**Step 2 — Paste it into SwyftStack**
Dashboard → Migrate → "From Railway."

**Step 3 — Wait for the progress bar**

**Step 4 — Update your app's `DATABASE_URL`**
Replace it with the new SwyftStack connection string. Redeploy.

### Section: Cost comparison

Railway Hobby PostgreSQL: $5 base + usage. For most real apps, that ends up around $10–$30/month depending on traffic. SwyftStack Starter: $19/month. Every month. No surprises.

### Final CTA

[Start migration]

---

## Page 14 — Migrate from Heroku Postgres (`/migrate-from-heroku`)

**Target keywords:** heroku postgres alternative, migrate from heroku postgres, leave heroku
**Visitor intent:** They're paying too much for Heroku Postgres and want out.

### Headline

Migrate from Heroku Postgres to SwyftStack in 3 clicks.

### Subheadline

Heroku Postgres Standard-0 starts at $50/month for 64 GB. Most apps need a fraction of that. SwyftStack Starter gives you a real PostgreSQL database, backups, and a custom domain for $19/month.

**CTA:** Start migration

### Section: How to migrate

**Step 1 — Get your Heroku Postgres connection string**

```bash
heroku config -a your-app-name
```

Look for `DATABASE_URL` in the output. Copy it.

**Step 2 — Paste it into SwyftStack**
Dashboard → Migrate → "From Heroku."

**Step 3 — Wait for the progress bar**

**Step 4 — Update your Heroku app's environment**

```bash
heroku config:set DATABASE_URL="your_new_swyftstack_connection_string"
```

Your app restarts with the new database.

### Section: Cost comparison

|                   | Heroku Standard-0 | SwyftStack Starter |
| ----------------- | ----------------- | ------------------ |
| Monthly price     | $50               | **$19**            |
| Daily backups     | ✅                | ✅                 |
| One-click restore | Manual            | **One click**      |
| Modern dashboard  | ❌                | ✅                 |
| Object storage    | Not included      | ✅ 100 GB          |

For most apps, switching cuts your bill by more than half while adding object storage you don't have today.

### Final CTA

[Start migration]

---

## Page 15 — Migrate from PlanetScale (`/migrate-from-planetscale`)

**Target keywords:** planetscale alternative, migrate from planetscale, planetscale free tier shutdown
**Visitor intent:** They lost the free tier and need somewhere to land.

### Headline

Migrate from PlanetScale to SwyftStack.

### Subheadline

PlanetScale ended its free tier and a lot of indie developers are looking for somewhere honest to land. We can help — with one important caveat you should know about up front.

**CTA:** Talk to us about migration

### Section: The honest disclosure

SwyftStack V1 only supports PostgreSQL. PlanetScale is MySQL. Migrating means converting your schema from MySQL to PostgreSQL.

**This is usually painless if:**

- Your app uses an ORM (Prisma, Drizzle, TypeORM, Sequelize, Knex)
- Your schema uses standard SQL types
- You don't depend on MySQL-specific syntax

**This requires more work if:**

- You have stored procedures or triggers written for MySQL
- You use MySQL-specific functions in queries
- You depend on PlanetScale's branching workflow extensively

We'd rather tell you this up front than surprise you mid-migration.

### Section: How a PlanetScale → SwyftStack migration works

1. **Export your PlanetScale schema and data** — either via PlanetScale's tools or our migration helper.
2. **We convert MySQL types to PostgreSQL** during import. Most types map directly; we flag anything that doesn't and ask you to confirm.
3. **We restore everything onto SwyftStack PostgreSQL.**
4. **You update your app code** — change the database driver, swap `provider = "mysql"` for `provider = "postgresql"` if you're on Prisma, regenerate, redeploy.

### Section: When you should make this switch

- You were going to consider PostgreSQL anyway (it's powerful, increasingly standard)
- You use an ORM that abstracts the database details
- You want predictable pricing without features disappearing

### Final CTA

[Talk to us about your migration]

---

## Page 16 — Supabase Alternative (`/supabase-alternative`)

**Target keywords:** supabase alternative, alternatives to supabase, supabase competitor
**Visitor intent:** Top of funnel — they're evaluating. They want to know who's out there and who fits.

### Headline

Looking for a Supabase alternative? Here's an honest comparison.

### Subheadline

We'll tell you when SwyftStack is the right choice and when Supabase is. Then you decide.

**CTA:** Compare in detail

### Section: When Supabase is the right choice

- You want auth, database, storage, edge functions, realtime, and vector search all from one provider
- You like auto-generated APIs over your tables
- You configure row-level security in the dashboard
- You're happy trading some simplicity for breadth of features

If those describe you, stay on Supabase. It's a great product.

### Section: When SwyftStack is the right choice

- You want managed PostgreSQL and storage — and nothing else
- You want a flat, predictable monthly bill
- You bring your own auth (NextAuth, Clerk, Auth0)
- You want a dashboard that loads instantly because it isn't trying to do ten things
- You're building with Lovable, Bolt, Cursor, or v0 and just need infrastructure that connects

### Section: Side-by-side

|                     | Supabase Pro | SwyftStack Starter |
| ------------------- | ------------ | ------------------ |
| Monthly price       | $25          | **$19**            |
| Database storage    | 8 GB         | **10 GB**          |
| Object storage      | 100 GB       | 100 GB             |
| Egress included     | 250 GB       | **500 GB**         |
| Daily backups       | ✅           | ✅                 |
| One-click restore   | Manual       | **One click**      |
| Auth service        | ✅ Included  | ❌ Bring your own  |
| Edge functions      | ✅           | ❌                 |
| Realtime            | ✅           | ❌                 |
| Auto-generated APIs | ✅           | ❌                 |
| Static site hosting | ❌           | ✅ Unlimited       |
| Annual discount     | Limited      | **21% off**        |

### Section: The honest summary

Supabase is a _platform_. SwyftStack is _infrastructure_.

Platforms give you many tools that work well together. Infrastructure gives you fewer tools that do less but get out of your way. Pick the philosophy that matches yours.

### CTAs

[Migrate from Supabase →](/migrate-from-supabase)
[Try SwyftStack Starter →](/pricing)

---

## Page 17 — Railway Alternative (`/railway-alternative`)

**Target keywords:** railway alternative, alternatives to railway, railway competitor
**Visitor intent:** Same evaluation mindset — they want honest comparison.

### Headline

Looking for a Railway alternative? Here's where we differ.

### Subheadline

Railway is great at hosting your whole app. SwyftStack is great at hosting your database. Sometimes you want the first; sometimes you want the second.

### Section: When Railway is the right choice

- You want one place to host your app, database, background workers, and cron tasks
- You like infrastructure-as-code workflows
- You're comfortable with usage-based billing for the flexibility
- You want to deploy your entire stack with one config

### Section: When SwyftStack is the right choice

- You only need a managed database and storage — not the rest of the platform
- You want a flat monthly bill instead of a usage meter
- You want backups, restore, and one-click migration as first-class features
- You're hosting your app on Vercel, Netlify, Fly, or your own VPS and just need data infrastructure

### Section: Side-by-side

|                   | Railway Hobby   | SwyftStack Starter |
| ----------------- | --------------- | ------------------ |
| Monthly price     | $5 base + usage | **$19 flat**       |
| Predictable bill  | ❌ usage-based  | ✅                 |
| Database storage  | 5 GB included   | **10 GB**          |
| Object storage    | Not built-in    | ✅ 100 GB          |
| Daily backups     | Manual setup    | ✅ Automatic       |
| One-click restore | ❌              | ✅                 |
| Migration tool    | ❌              | ✅                 |
| App hosting       | ✅              | ❌                 |
| Static hosting    | Limited         | ✅ Unlimited       |

### Section: They can work together

Plenty of teams host their app on Railway and their database on SwyftStack. Different tools for different jobs — pick the best of each.

### CTAs

[Migrate from Railway →](/migrate-from-railway)
[Try SwyftStack Starter →](/pricing)

---

## Page 18 — Heroku Postgres Alternative (`/heroku-postgres-alternative`)

**Target keywords:** heroku postgres alternative, alternatives to heroku, cheap heroku postgres
**Visitor intent:** Heroku Postgres is too expensive. They want a cheaper drop-in.

### Headline

A cheaper, faster Heroku Postgres alternative.

### Subheadline

Heroku Postgres Standard-0 starts at $50/month. SwyftStack Starter gives you a real PostgreSQL database with backups, restore, object storage, and a modern dashboard for $19/month.

**CTA:** Compare and migrate

### Section: Why people leave Heroku Postgres

- Standard-0 is $50/month even if you only need 1 GB
- The free Hobby tier is gone, and Mini at $5/month is too restrictive for real apps
- The dashboard hasn't been seriously updated in years
- Tooling around it feels frozen in 2015

### Section: Side-by-side

|                   | Heroku Standard-0 | SwyftStack Starter |
| ----------------- | ----------------- | ------------------ |
| Monthly price     | $50               | **$19**            |
| Storage           | 64 GB             | 10 GB \*           |
| Daily backups     | ✅                | ✅                 |
| One-click restore | Manual            | **One click**      |
| Object storage    | Not included      | ✅ 100 GB          |
| Modern dashboard  | ❌                | ✅                 |

_Need more than 10 GB? Pro at $99/month gets you 100 GB — still cheaper than Heroku's higher tiers._

### Section: How migration works

Get your `DATABASE_URL` from `heroku config`, paste it into SwyftStack, wait for the progress bar, update Heroku with the new connection string. Your app keeps running.

[Detailed migration guide →](/migrate-from-heroku)

### CTAs

[Migrate from Heroku Postgres →](/migrate-from-heroku)
[See full pricing →](/pricing)

---

## Page 19 — Render Alternative (`/render-alternative`)

**Target keywords:** render alternative, alternatives to render, render postgres alternative
**Visitor intent:** Evaluating Render or considering switching.

### Headline

Looking for a Render alternative for your database?

### Subheadline

Render is a solid all-in-one PaaS. If you only need the database part — and you want it faster, cheaper, and with one-click migration in from anywhere — we're a better fit.

### Section: When Render is the right choice

- You want a full PaaS (web services, workers, cron, static sites, databases) from one provider
- You're moving off Heroku and want a similar mental model
- You need private networking between services

### Section: When SwyftStack is the right choice

- You want PostgreSQL deployed in seconds, not minutes
- You want backups and restore as first-class features, not extras
- You want a faster, friendlier dashboard
- You're happy hosting your app elsewhere

### Section: Side-by-side

|                     | Render Starter PG | SwyftStack Starter |
| ------------------- | ----------------- | ------------------ |
| Monthly price       | $7 (limited)      | $19                |
| Storage             | 1 GB              | **10 GB**          |
| Backups             | Daily, 7 days     | Daily, 7 days      |
| One-click restore   | Manual            | **One click**      |
| One-click migration | ❌                | ✅                 |
| Deploy time         | Several minutes   | **Under a minute** |
| Object storage      | Not included      | ✅ 100 GB          |

### CTAs

[Try SwyftStack →](/pricing)
[Start a migration →](/migrate)

---

## Page 20 — PostgreSQL for Next.js (`/postgresql-for-nextjs`)

**Target keywords:** postgresql for nextjs, nextjs database, nextjs postgres setup
**Visitor intent:** They're using Next.js and need to wire up a database.

### Headline

PostgreSQL for your Next.js app, ready in minutes.

### Subheadline

A managed PostgreSQL database and S3-compatible storage, both wired up to your Next.js app in less time than `npm install` takes on a Monday morning.

**CTA:** Deploy a database

### Section: Setup

**Step 1 — Deploy a SwyftStack database** and copy the connection string.

**Step 2 — Add to `.env.local`:**

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
```

**Step 3 — Pick your data layer:**

**Prisma:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
npx prisma db push
```

**Drizzle:**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

**Raw pg:**

```ts
import { Pool } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### Section: Deploying

Host your Next.js app wherever — Vercel, Netlify, Fly, your own VPS. SwyftStack hosts your data layer. Set `DATABASE_URL` in your hosting provider's environment variables and you're done.

### Section: File uploads

For user uploads (profile pictures, attachments), use SwyftStack Storage with the AWS S3 SDK:

```ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY!,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY!,
  },
});

await s3.send(
  new PutObjectCommand({
    Bucket: "my-uploads",
    Key: filename,
    Body: buffer,
  }),
);
```

### Final CTA

[Deploy a database for my Next.js app]

---

## Page 21 — PostgreSQL for Django (`/postgresql-for-django`)

**Target keywords:** django postgresql, django database hosting, postgresql for django
**Visitor intent:** Django developers looking for managed PostgreSQL.

### Headline

PostgreSQL for Django, ready in minutes.

### Subheadline

Django and PostgreSQL are made for each other. SwyftStack gives you the PostgreSQL part — managed, backed up, with SSL on by default — in under a minute.

**CTA:** Deploy a database

### Section: Setup with `dj-database-url`

**Step 1 — Deploy a database and copy the connection string.**

**Step 2 — Install:**

```bash
pip install dj-database-url psycopg[binary]
```

**Step 3 — Add to `settings.py`:**

```python
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ["DATABASE_URL"],
        conn_max_age=600,
        ssl_require=True,
    )
}
```

**Step 4 — Migrate:**

```bash
python manage.py migrate
```

### Section: File uploads with `django-storages`

```bash
pip install django-storages[boto3]
```

```python
# settings.py
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "endpoint_url": "https://storage.swyftstack.com",
            "access_key": os.environ["SWYFTSTACK_ACCESS_KEY"],
            "secret_key": os.environ["SWYFTSTACK_SECRET_KEY"],
            "bucket_name": "my-uploads",
            "region_name": "auto",
        },
    },
}
```

User uploads now go straight to SwyftStack Storage. `ImageField` and `FileField` work normally.

### Final CTA

[Deploy a database for my Django app]

---

## Page 22 — PostgreSQL for Laravel (`/postgresql-for-laravel`)

**Target keywords:** laravel postgresql, laravel database hosting, postgresql for laravel
**Visitor intent:** Laravel developers, often coming from MySQL, looking at PostgreSQL.

### Headline

PostgreSQL for Laravel, ready in minutes.

### Subheadline

Laravel speaks PostgreSQL fluently. SwyftStack gives Laravel a PostgreSQL database it'll be happy with — provisioned in under a minute, with SSL, backups, and a copyable connection string.

**CTA:** Deploy a database

### Section: Setup

**Step 1 — Deploy a database and grab the connection details.**

**Step 2 — Update `.env`:**

```env
DB_CONNECTION=pgsql
DB_HOST=your.swyftstack.host
DB_PORT=5432
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_pass
DB_SSLMODE=require
```

**Step 3 — In `config/database.php`, inside the `pgsql` array, add:**

```php
'sslmode' => env('DB_SSLMODE', 'prefer'),
```

**Step 4 — Migrate:**

```bash
php artisan migrate
```

### Section: File uploads with Laravel Filesystem

```php
// config/filesystems.php
'disks' => [
    'swyftstack' => [
        'driver' => 's3',
        'key' => env('SWYFTSTACK_ACCESS_KEY'),
        'secret' => env('SWYFTSTACK_SECRET_KEY'),
        'region' => 'auto',
        'bucket' => 'my-uploads',
        'endpoint' => 'https://storage.swyftstack.com',
        'use_path_style_endpoint' => true,
    ],
],
```

Then use it anywhere:

```php
Storage::disk('swyftstack')->put('avatars/user-1.png', $contents);
```

### Final CTA

[Deploy a database for my Laravel app]

---

## Page 23 — PostgreSQL for Node.js / Express (`/nodejs-postgresql`)

**Target keywords:** nodejs postgresql, express postgres, node postgres hosting
**Visitor intent:** Node.js developers looking to set up PostgreSQL.

### Headline

PostgreSQL for Node.js, ready in minutes.

### Subheadline

Express, Fastify, Hono, Nest — whatever Node framework you use, SwyftStack gives you a managed PostgreSQL database that connects in under five minutes.

**CTA:** Deploy a database

### Section: Setup with `pg`

```bash
npm install pg
```

```js
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
```

### Section: Setup with Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
npx prisma db push
```

### Section: Setup with Drizzle

```bash
npm install drizzle-orm postgres
```

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

### Section: File uploads with Multer + S3

```js
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("file"), async (req, res) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: "my-uploads",
      Key: req.file.originalname,
      Body: req.file.buffer,
    }),
  );
  res.json({ ok: true });
});
```

### Final CTA

[Deploy a database for my Node app]

---

## Page 24 — About (`/about`)

**Target keywords:** swyftstack about, swyftstack company
**Visitor intent:** Due diligence — they want to know who's behind this before paying.

### Headline

We built SwyftStack because backend hosting was getting harder, not easier.

### The story

Every year, cloud platforms add more features, more dashboards, more tabs, more services that depend on other services. Meanwhile, the actual thing most developers want hasn't changed: _a database for my app, and somewhere to store user files._

So we built that. Two products. Both simple. Both fast. Both backed by a real human who answers your emails.

### What we believe

**Speed is a feature.** Deploying a database in 47 seconds isn't a marketing number — it's a design constraint that shapes everything else we build.

**Simplicity is a feature.** We've removed words from the dashboard for a year. We're not done.

**Predictability is a feature.** Your bill should be the same number every month unless _you_ change something.

**Honesty is a feature.** If a competitor is right for your use case, we'll tell you. We'd rather lose a sale than mis-fit a customer.

### Why we charge for everything

Free tiers force paying customers to subsidize freeloaders. We answer every support email personally — we can only do that if we're paid. If $19/month isn't right for you, we'll happily help you find a free alternative.

### Why we don't offer self-hosting

The whole point of SwyftStack is that you don't operate infrastructure. Self-hosting would ship the same complexity we're trying to remove. PostgreSQL itself is open source and excellent — if you want to run it yourself, do that. We'd be a worse choice.

### CTAs

[Try SwyftStack] [Email the founder]

---

## Page 25 — Security & Trust (`/security`)

**Target keywords:** swyftstack security, database security, managed postgresql security
**Visitor intent:** Enterprise or security-conscious buyer doing diligence.

### Headline

What we promise. What we measure. What we share.

### Section: Uptime SLA

- **Starter:** 99.9% monthly uptime
- **Pro:** 99.95% monthly uptime
- **Enterprise:** 99.99% monthly uptime

Credits issued automatically when we miss it. No support ticket needed.

### Section: Backups

- **Starter:** Daily, encrypted, retained 7 days
- **Pro:** Daily, encrypted, retained 30 days
- **Enterprise:** Custom retention, point-in-time options on request

Every backup is restorable in one click. We test restores weekly because untested backups aren't backups.

### Section: Encryption

- SSL/TLS on every database connection, on by default, non-optional
- AES-256 disk encryption at rest
- Encrypted backups
- Encrypted object storage

### Section: Access control

- Two-factor authentication on SwyftStack accounts
- Connection IP allowlisting (configurable per database)
- Audit logs on Pro and above
- SSO via SAML on Enterprise

### Section: Compliance

We're early — here's our honest state:

- SOC 2 Type 1 in progress (expected by Q4)
- GDPR compliant (EU data residency available)
- DPAs available for Pro and Enterprise customers

We'll update this page as compliance work completes. We won't claim anything we haven't actually done.

### Section: Status page

Live status at [status.swyftstack.com](https://status.swyftstack.com) — updated automatically, with full incident history.

### Section: Incident reports

When something goes wrong, we publish a postmortem within 7 days. What happened, why, and what we changed. No corporate-speak.

### Final CTA

[See live status →]

---

## Appendix — Copy patterns to keep consistent

| Don't say                 | Say                                                                 |
| ------------------------- | ------------------------------------------------------------------- |
| Provision database        | Create a database                                                   |
| Spin up an instance       | Deploy a database                                                   |
| Configure SSL             | _(don't mention it — just do it)_                                   |
| Container / pod / cluster | _(avoid entirely in user-facing copy)_                              |
| Connection string         | _(use as-is for devs; "database link" only for absolute beginners)_ |
| 500 error                 | "Something went wrong on our side. We're already looking into it."  |
| Quota exceeded            | "You've hit your plan's limit. Here's how to add more headroom."    |
| Authentication failed     | "Your password didn't match. Try again or reset it."                |

### Welcome email

> Hi [first name],
>
> I'm [founder name]. I run SwyftStack. I wanted to say hi personally — and ask one question: what brought you here?
>
> Reply to this email. I read every one.
>
> — [founder name]

---

_End of V1 marketing pages._
