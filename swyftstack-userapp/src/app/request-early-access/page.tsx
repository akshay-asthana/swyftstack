import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { Section } from "@/components/marketing/sections";
import { SITE_URL } from "@/components/marketing/jsonld";
import { isEarlyAccessMode } from "@/lib/early-access";

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
  if (!isEarlyAccessMode()) notFound();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  if (!email || !name) {
    redirect("/request-early-access?error=required");
  }

  await prisma.earlyAccessRequest.create({
    data: {
      email,
      name,
      company: str(formData, "company") || null,
      role: str(formData, "role") || null,
      country: str(formData, "country") || null,
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
  if (!isEarlyAccessMode()) notFound();
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
            <form action={requestAccess} className="m-form">
              <div className="m-grid m-grid-2">
                <div>
                  <label>Name <span className="m-req" aria-hidden>*</span></label>
                  <input name="name" required autoComplete="name" />
                </div>
                <div>
                  <label>Email <span className="m-req" aria-hidden>*</span></label>
                  <input name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <label>Company <span className="m-muted">(optional)</span></label>
                  <input name="company" autoComplete="organization" />
                </div>
                <div>
                  <label>Role <span className="m-muted">(optional)</span></label>
                  <input name="role" autoComplete="organization-title" />
                </div>
                <div>
                  <label>Country <span className="m-muted">(optional)</span></label>
                  <input
                    name="country"
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
                  Please fill in your name and email.
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
