// Storage / backup provider setup guides (§14). Seeded into provider_help_docs
// and rendered by the admin Help page. Credentials are NEVER hardcoded — these
// are instructions for the admin to register a provider from the control plane.

export interface ProviderHelpBody {
  credentials: string[];
  endpointFormat: string;
  regionFormat: string;
  bucketNaming: string;
  pathStyle: string;
  testConnection: string;
  asObjectStorage: string;
  asBackupProvider: string;
  commonErrors: { error: string; fix: string }[];
}

export interface ProviderHelpDocSeed {
  slug: string;
  providerKey: string;
  category: string;
  title: string;
  summary: string;
  sortOrder: number;
  body: ProviderHelpBody;
}

export const PROVIDER_HELP_DOCS: ProviderHelpDocSeed[] = [
  {
    slug: "backblaze-b2",
    providerKey: "b2",
    category: "both",
    title: "Backblaze B2",
    summary: "Low-cost S3-compatible object storage. Works for both customer buckets and backups.",
    sortOrder: 10,
    body: {
      credentials: [
        "Backblaze account → App Keys → Add a New Application Key.",
        "keyID — used as the S3 Access Key ID.",
        "applicationKey — used as the S3 Secret Access Key (shown once, copy it).",
        "Create a Bucket under B2 Cloud Storage → Buckets first; note its endpoint.",
      ],
      endpointFormat: "https://s3.<region>.backblazeb2.com  (e.g. https://s3.us-west-004.backblazeb2.com)",
      regionFormat: "Region code from the bucket endpoint, e.g. us-west-004, eu-central-003.",
      bucketNaming: "Globally unique, 6–50 chars, lowercase letters/digits/hyphens. No underscores or dots.",
      pathStyle: "Not required — B2's S3 API uses virtual-hosted-style by default. Leave path-style OFF.",
      testConnection:
        "aws s3 ls --endpoint-url https://s3.us-west-004.backblazeb2.com s3://your-bucket",
      asObjectStorage:
        "Providers → Object Storage → New. Provider = b2, endpoint + region as above, paste keyID/applicationKey, default bucket = your bucket.",
      asBackupProvider:
        "Providers → Backup Storage → New. Provider = b2, same endpoint/region/keys, set a prefix like backups/ and a retention policy.",
      commonErrors: [
        { error: "403 Forbidden / SignatureDoesNotMatch", fix: "Wrong applicationKey, or the key is scoped to a different bucket. Create an unrestricted key or one scoped to this bucket." },
        { error: "Bucket not found", fix: "The region in the endpoint does not match the bucket's region. Copy the exact endpoint shown on the bucket page." },
        { error: "InvalidAccessKeyId", fix: "Use the keyID (not the key name) as the Access Key ID." },
      ],
    },
  },
  {
    slug: "cloudflare-r2",
    providerKey: "r2",
    category: "both",
    title: "Cloudflare R2",
    summary: "S3-compatible storage with zero egress fees. Good default for customer object storage.",
    sortOrder: 20,
    body: {
      credentials: [
        "Cloudflare dashboard → R2 → Manage R2 API Tokens → Create API Token.",
        "Access Key ID and Secret Access Key are shown once on creation.",
        "Your Cloudflare Account ID (R2 overview page) — it forms the endpoint host.",
        "Create an R2 bucket under R2 → Overview.",
      ],
      endpointFormat: "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
      regionFormat: "Always 'auto' — R2 does not use named regions.",
      bucketNaming: "3–63 chars, lowercase letters/digits/hyphens; must start and end alphanumeric.",
      pathStyle: "R2 supports both; path-style is the most reliable. Leave path-style ON.",
      testConnection:
        "aws s3 ls --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com --region auto",
      asObjectStorage:
        "Providers → Object Storage → New. Provider = r2, endpoint = your account endpoint, region = auto, paste the token keys. For public buckets, set the R2 public bucket URL as the public base URL.",
      asBackupProvider:
        "Providers → Backup Storage → New. Provider = r2, region = auto, same endpoint/keys, prefix backups/.",
      commonErrors: [
        { error: "NoSuchBucket", fix: "The endpoint Account ID is wrong. Copy it from the R2 overview page." },
        { error: "AccessDenied", fix: "The API token lacks Object Read & Write. Recreate the token with Admin Read & Write or per-bucket Edit permission." },
        { error: "InvalidRegion", fix: "Region must be the literal string 'auto'." },
      ],
    },
  },
  {
    slug: "hetzner-object-storage",
    providerKey: "hetzner",
    category: "both",
    title: "Hetzner Object Storage",
    summary: "S3-compatible object storage in Hetzner's EU regions, billed with the rest of your Hetzner project.",
    sortOrder: 30,
    body: {
      credentials: [
        "Hetzner Cloud Console → your project → Object Storage.",
        "Create a bucket — choose a location (fsn1, nbg1 or hel1).",
        "Generate S3 credentials → Access Key and Secret Key (shown once).",
      ],
      endpointFormat: "https://<region>.your-objectstorage.com  (e.g. https://fsn1.your-objectstorage.com)",
      regionFormat: "Hetzner location code: fsn1 (Falkenstein), nbg1 (Nuremberg), hel1 (Helsinki).",
      bucketNaming: "3–63 chars, lowercase letters/digits/hyphens. Globally unique within the region.",
      pathStyle: "Hetzner supports virtual-hosted style; path-style also works. Leave path-style ON if DNS for the bucket subdomain is not resolving.",
      testConnection:
        "aws s3 ls --endpoint-url https://fsn1.your-objectstorage.com s3://your-bucket",
      asObjectStorage:
        "Providers → Object Storage → New. Provider = hetzner, endpoint + region as above, paste the Access/Secret key, default bucket = your bucket.",
      asBackupProvider:
        "Providers → Backup Storage → New. Provider = hetzner, same endpoint/region/keys, prefix backups/, retention policy as required.",
      commonErrors: [
        { error: "Connection refused / DNS failure", fix: "The region in the endpoint is wrong, or the bucket is in a different location than the endpoint." },
        { error: "403 Forbidden", fix: "S3 credentials are per-bucket on Hetzner — regenerate credentials for the correct bucket." },
        { error: "SignatureDoesNotMatch", fix: "Enable path-style addressing; some clients mishandle the bucket subdomain." },
      ],
    },
  },
  {
    slug: "ovh-object-storage",
    providerKey: "ovh",
    category: "both",
    title: "OVHcloud Object Storage (S3)",
    summary: "OVH Public Cloud S3-compatible object storage across EU and North American regions.",
    sortOrder: 40,
    body: {
      credentials: [
        "OVH Manager → Public Cloud → Object Storage → Object Storage (S3).",
        "Users & Roles → create or pick a user, then generate an S3 access key + secret.",
        "Create a bucket in the same region as the user's S3 endpoint.",
      ],
      endpointFormat: "https://s3.<region>.io.cloud.ovh.net  (e.g. https://s3.gra.io.cloud.ovh.net)",
      regionFormat: "OVH region code: gra, sbg, bhs, de, uk, waw (lowercase).",
      bucketNaming: "3–63 chars, lowercase letters/digits/hyphens; must be unique within the region.",
      pathStyle: "Required — set path-style ON. OVH's S3 gateway expects path-style requests.",
      testConnection:
        "aws s3 ls --endpoint-url https://s3.gra.io.cloud.ovh.net --region gra s3://your-bucket",
      asObjectStorage:
        "Providers → Object Storage → New. Provider = ovh, endpoint + region as above, path-style ON, paste the S3 access key + secret.",
      asBackupProvider:
        "Providers → Backup Storage → New. Provider = ovh, same endpoint/region/keys, path-style ON, prefix backups/.",
      commonErrors: [
        { error: "SignatureDoesNotMatch", fix: "Path-style addressing is mandatory for OVH S3 — make sure path-style is ON." },
        { error: "301 / region redirect", fix: "The endpoint region does not match the bucket region. Use the s3.<region> host for the bucket's region." },
        { error: "AccessDenied", fix: "The S3 user has no role on the bucket — assign the user the appropriate Object Storage role in OVH." },
      ],
    },
  },
];
