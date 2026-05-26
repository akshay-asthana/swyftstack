import "./globals.css";
import "@/styles/theme.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { TopLoadingBar } from "@/components/client";
import faviconIco from "@/brand-assets/Swyftstack-logo.ico";
import swyftstackLogo from "@/brand-assets/Swyftstack-logo.png";
import { SITE_URL } from "@/components/marketing/jsonld";

// Favicon and apple-touch icon are sourced directly from src/brand-assets so
// there is exactly one copy of each asset in the repo. The App Router's
// "app/favicon.ico" convention is deliberately not used here — having a
// duplicate file invariably drifts when the brand assets are refreshed.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Swyftstack", template: "%s | Swyftstack" },
  description: "Managed PostgreSQL and S3-compatible storage. Deploy a production-ready backend in 47 seconds, on one platform with one bill.",
  applicationName: "Swyftstack",
  authors: [{ name: "Swyftstack" }],
  icons: {
    icon: [{ url: faviconIco.src, sizes: "any" }],
    shortcut: [faviconIco.src],
    apple: [{ url: swyftstackLogo.src, sizes: "180x180", type: "image/png" }],
  },
};

// Sets the viewport so mobile devices render the marketing site at the
// expected width instead of a zoomed-out desktop layout. `themeColor` lets
// mobile Safari + Android tint the URL bar to match the brand.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07080d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-console-theme="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("swyftstack:console-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.consoleTheme=t;}}catch(e){}`,
          }}
        />
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
