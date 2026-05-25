// /storage — public marketing page for S3-compatible object storage.
// The authenticated console listing now lives at /console/storage.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard } from "@/components/marketing/sections";
import { CodeSnippet } from "@/components/marketing/code-snippet";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { StorageBucketVisual, SignedUrlCard, UsageGraphVisual } from "@/components/marketing/product-visuals";
import {
  ArrowRightIcon, BoltIcon, BucketIcon, GlobeIcon, LockIcon,
} from "@/components/marketing/icons";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Object storage — S3-compatible | Swyftstack",
  description: "Store images, PDFs, user uploads, and anything else. S3-compatible API every framework and SDK already knows — change the endpoint, leave everything else alone.",
  alternates: { canonical: `${SITE_URL}/storage` },
};

const FAQ = [
  { q: "Is this actually S3-compatible or just claiming to be?", a: "Actually compatible. We pass the AWS S3 test suite for the operations we support. AWS SDK v2/v3, boto3, Minio client, MinIO mc — if it speaks S3, it speaks Swyftstack." },
  { q: "What about CORS?", a: "Configurable per bucket in the dashboard. No XML files." },
  { q: "Do public URLs expire?", a: "No. Public files have permanent URLs. Private files use signed URLs you generate with your own expiry times." },
  { q: "Is there a CDN?", a: "Yes. Public buckets are CDN-fronted automatically at no extra cost." },
  { q: "Can I use it as a Terraform/IaC target?", a: "Yes. Use the AWS provider with an `endpoint` override pointing at storage.swyftstack.com." },
  { q: "Can I store backups here?", a: "Yes. Swyftstack PostgreSQL backups already go to your account's storage by default. Bring-your-own buckets supported on Pro." },
];

const SNIPPETS = [
  { name: "Node (AWS SDK v3)", language: "ts" as const, code: `import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY!,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY!,
  },
});

await s3.send(new PutObjectCommand({
  Bucket: "my-app-uploads",
  Key: "users/123/avatar.png",
  Body: fileBuffer,
  ContentType: "image/png",
}));` },
  { name: "Python (boto3)", language: "py" as const, code: `import boto3, os

s3 = boto3.client(
  "s3",
  endpoint_url="https://storage.swyftstack.com",
  aws_access_key_id=os.environ["SWYFTSTACK_ACCESS_KEY"],
  aws_secret_access_key=os.environ["SWYFTSTACK_SECRET_KEY"],
)

s3.upload_file("avatar.png", "my-app-uploads", "users/123/avatar.png")` },
  { name: "Go", language: "ts" as const, code: `cfg, _ := config.LoadDefaultConfig(ctx,
  config.WithRegion("auto"),
  config.WithEndpointResolver(aws.EndpointResolverFunc(func(_, _ string) (aws.Endpoint, error) {
    return aws.Endpoint{ URL: "https://storage.swyftstack.com" }, nil
  })),
)
client := s3.NewFromConfig(cfg)` },
  { name: "PHP (Laravel)", language: "php" as const, code: `'swyftstack' => [
  'driver' => 's3',
  'key' => env('SWYFTSTACK_ACCESS_KEY'),
  'secret' => env('SWYFTSTACK_SECRET_KEY'),
  'region' => 'auto',
  'bucket' => env('SWYFTSTACK_BUCKET'),
  'endpoint' => 'https://storage.swyftstack.com',
  'use_path_style_endpoint' => true,
],` },
];

export default function StorageMarketingPage() {
  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ} />

      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Object storage</div>
          <h1>S3-compatible object storage, <span className="m-text-grad">without the AWS bill</span>.</h1>
          <p className="m-hero-lead">
            Same S3 API your SDK already speaks. Change one line, you&rsquo;re done.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
              Start storing files <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/pricing">See pricing</Link>
          </div>
          <div className="m-hero-visual" style={{ maxWidth: 880 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18, textAlign: "left" }} className="m-section-grid-2">
              <StorageBucketVisual />
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <SignedUrlCard />
                <UsageGraphVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section borderTop>
        <SectionHead
          eyebrow="Why we built this"
          title="The S3 API. None of the AWS yak-shaving."
          subtitle="Every modern app needs to store files. The default is AWS S3 — works, but ships with a console you have to learn, JSON bucket policies, and a bill that's hard to predict. We made the API the same and everything else simpler."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<BucketIcon size={22} />} title="Same API as AWS S3" body="PutObject, GetObject, DeleteObject, ListObjects, presigned URLs, multipart upload — all the standard operations work." />
          <FeatureCard icon={<GlobeIcon size={22} />} title="Public buckets get CDN URLs" body="Flip a toggle, your files get a fast URL that works globally. No extra config, no extra bill." />
          <FeatureCard icon={<LockIcon size={22} />} title="Private buckets use signed URLs" body="Generate time-limited URLs from your app — same as you would on S3. Per-bucket access keys." />
        </div>
      </Section>

      <Section alt>
        <SectionHead
          eyebrow="Code examples"
          title="Change the endpoint. Leave everything else alone."
          subtitle="If it speaks S3, it speaks Swyftstack. Pick your language; the snippet is the same one you'd write against AWS."
        />
        <CodeSnippet snippets={SNIPPETS} />
      </Section>

      <Section>
        <SectionHead
          eyebrow="What you actually need"
          title="Operationally complete"
          subtitle="Beyond the API: the controls you'd be hand-wiring on AWS, included by default."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<BoltIcon size={22} />} title="CORS without XML" body="Configurable per bucket in the dashboard. Origins, methods, headers, max-age — all in a form, not a JSON blob." />
          <FeatureCard icon={<LockIcon size={22} />} title="Per-bucket access keys" body="Scoped credentials so a leaked key never blast-radiuses across your whole storage account." />
          <FeatureCard icon={<GlobeIcon size={22} />} title="Permanent public URLs" body="No mystery expiry on assets you mean to be public. Predictable, indexable, CDN-cached." />
          <FeatureCard icon={<BucketIcon size={22} />} title="Multipart upload" body="Large file uploads (videos, dataset dumps) work over the same API your AWS SDK already uses." />
          <FeatureCard icon={<BoltIcon size={22} />} title="Webhook notifications" body="Get notified when objects land in a bucket — wire it to your indexer or thumbnail pipeline." />
          <FeatureCard icon={<LockIcon size={22} />} title="Server-side encryption" body="AES-256 at rest by default. Customer-managed keys on Enterprise." />
        </div>
      </Section>

      <Section alt>
        <div className="m-card m-card-glow" style={{ padding: 36, textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Included on every plan</h2>
          <p className="m-feature-body" style={{ maxWidth: 580, margin: "0 auto" }}>
            <strong>Starter:</strong> 100 GB storage, 500 GB egress.&nbsp;
            <strong>Pro:</strong> 1 TB storage, 5 TB egress.
            For reference, that&rsquo;s ~200,000 typical avatar images on Starter, or ~50,000 product photos.
          </p>
          <div className="m-row m-mt-5" style={{ justifyContent: "center" }}>
            <Link className="m-btn m-btn-primary m-btn-lg" href="/pricing">See pricing</Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/signup">Start storing files</Link>
          </div>
        </div>
      </Section>

      <FAQSection title="Storage FAQ" items={FAQ} />

      <CTASection
        title="Store files. Build features. Skip AWS."
        subtitle="Included in every plan. The SDK you already use. The endpoint is the only thing that changes."
        primary={{ label: "Start storing files", href: "/signup" }}
        secondary={{ label: "See platform overview", href: "/platform" }}
      />
    </MarketingShell>
  );
}
