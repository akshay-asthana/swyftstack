import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swyftstack — Infra Control Plane",
  description: "Admin control plane for the Swyftstack PaaS/DBaaS platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
