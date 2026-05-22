import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swyftstack",
  description: "Manage your Swyftstack apps, databases, and storage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
