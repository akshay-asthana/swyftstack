import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { Section } from "@/components/marketing/sections";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request Early Access - Swyftstack",
  description: "Request early access to Swyftstack.",
  alternates: { canonical: `${SITE_URL}/request-early-access` },
};

function hval(name: string): string | null {
  const value = headers().get(name);
  return value && value.trim() ? value.trim() : null;
}

function requestLocation() {
  const forwardedFor = hval("x-forwarded-for");
  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() ?? hval("x-real-ip"),
    ipCountry: hval("x-vercel-ip-country") ?? hval("cf-ipcountry"),
    ipRegion: hval("x-vercel-ip-country-region"),
    ipCity: hval("x-vercel-ip-city"),
    ipTimezone: hval("x-vercel-ip-timezone"),
    ipLatitude: hval("x-vercel-ip-latitude"),
    ipLongitude: hval("x-vercel-ip-longitude"),
    userAgent: hval("user-agent"),
  };
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function requestAccess(formData: FormData) {
  "use server";
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const company = str(formData, "company");
  const role = str(formData, "role");
  const country = str(formData, "country");
  // Required: email, name, company, role, country. We explicitly ask for the
  // country even though we capture an IP-derived country header, because the
  // IP value can be missing/wrong (VPNs, dev hits) and we want the requester's
  // self-reported value for compliance/onboarding decisions.
  if (!email || !name || !company || !role || !country) {
    redirect("/request-early-access?error=required");
  }

  await prisma.earlyAccessRequest.create({
    data: {
      email,
      name,
      company,
      role,
      country,
      phone: str(formData, "phone") || null,
      ...requestLocation(),
      metadata: {
        source: "request-early-access",
        acceptLanguage: hval("accept-language"),
      },
    },
  });
  redirect("/request-early-access?submitted=1");
}

export default function RequestEarlyAccessPage({
  searchParams,
}: {
  searchParams: { submitted?: string; error?: string };
}) {
  const submitted = searchParams.submitted === "1";
  const error = searchParams.error === "required";

  return (
    <MarketingShell>
      <section className="m-hero" style={{ paddingBottom: 40 }}>
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Early access</div>
          <h1>Request early access to <span className="m-text-grad">Swyftstack</span>.</h1>
          <p className="m-hero-lead">
            We are onboarding production users in small batches so support stays personal.
          </p>
        </div>
      </section>

      <Section tight>
        <div className="m-card" style={{ maxWidth: 680, margin: "0 auto" }}>
          {submitted ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ fontSize: 28 }}>You&apos;re on the list.</h2>
              <p className="m-feature-body">
                Thanks for reaching out. We&apos;ll review your request and reply when your organization is ready to be onboarded.
              </p>
              <Link className="m-btn m-btn-secondary" href="/">Back to home</Link>
            </div>
          ) : (
            <form action={requestAccess}>
              <div className="m-grid m-grid-2">
                <div>
                  <label>Name</label>
                  <input name="name" required autoComplete="name" />
                </div>
                <div>
                  <label>Email</label>
                  <input name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <label>Company</label>
                  <input name="company" required autoComplete="organization" />
                </div>
                <div>
                  <label>Role</label>
                  <input name="role" required autoComplete="organization-title" />
                </div>
                <div>
                  <label>Country</label>
                  <input
                    name="country"
                    required
                    autoComplete="country-name"
                    placeholder="e.g. United States"
                  />
                </div>
                <div>
                  <label>Phone <span className="m-muted">(optional)</span></label>
                  <input name="phone" type="tel" autoComplete="tel" />
                </div>
              </div>
              {error && (
                <div className="err">
                  Please fill in name, email, company, role, and country.
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                <button className="m-btn m-btn-primary m-btn-lg" type="submit">Request early access</button>
              </div>
            </form>
          )}
        </div>
      </Section>
    </MarketingShell>
  );
}
