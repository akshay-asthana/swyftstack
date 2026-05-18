import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quickdock — Infra Control Plane",
  description: "Admin control plane for the Quickdock PaaS/DBaaS platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
