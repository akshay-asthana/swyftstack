// JSON-LD helpers. Renders `<script type="application/ld+json">` so pages
// can advertise Organization / SoftwareApplication / BlogPosting / FAQPage
// structured data. Keep all marketing-relevant types in one file so we have
// a single audit point for SEO markup.

export const SITE_URL = process.env.NEXT_PUBLIC_MARKETING_URL?.replace(/\/$/, "") || "https://swyftstack.com";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify on simple objects is safe; we never embed user input here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Swyftstack",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        sameAs: [],
        contactPoint: [{
          "@type": "ContactPoint",
          email: "support@swyftstack.com",
          contactType: "customer support",
        }],
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Swyftstack",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "19",
          priceCurrency: "USD",
        },
        description:
          "Managed PostgreSQL, S3-compatible object storage, and static site hosting - deployed in minutes from a single dashboard.",
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      }}
    />
  );
}

export function BlogPostingJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  author,
  image,
}: {
  title: string;
  description?: string;
  url: string;
  datePublished?: Date | string;
  dateModified?: Date | string;
  author?: string;
  image?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: title,
        description,
        url,
        datePublished: toIso(datePublished),
        dateModified: toIso(dateModified ?? datePublished),
        author: { "@type": "Organization", name: author ?? "Swyftstack" },
        publisher: { "@type": "Organization", name: "Swyftstack", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
        image: image ? [image] : undefined,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: it.url,
        })),
      }}
    />
  );
}

function toIso(d?: Date | string): string | undefined {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString();
}
