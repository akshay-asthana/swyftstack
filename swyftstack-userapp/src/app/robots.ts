// robots.txt — allow public marketing routes and the CMS-published blog /
// announcements. Block the authenticated console, all API routes, and any
// auth-only flows.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/components/marketing/jsonld";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/console",
          "/console/",
          "/api/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/settings",
          "/team",
          "/invite",
          "/billing",
          "/usage",
          "/projects",
          "/databases",
          "/backups",
          "/migrations",
          "/notifications",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
